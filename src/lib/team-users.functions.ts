import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type MyContext = {
  userId: string;
  orgOwnerId: string;
  role: "admin" | "operator";
  isAdmin: boolean;
  teamMember: { id: string; team_id: string; name: string } | null;
};

export const getMyContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<MyContext> => {
    const { data: roleRow } = await context.supabase
      .from("user_roles")
      .select("org_owner_id, role")
      .eq("user_id", context.userId)
      .maybeSingle();

    const orgOwnerId = roleRow?.org_owner_id ?? context.userId;
    const role = (roleRow?.role ?? "admin") as "admin" | "operator";

    let teamMember: MyContext["teamMember"] = null;
    if (role === "operator") {
      const { data: tm } = await context.supabase
        .from("team_members")
        .select("id, team_id, name")
        .eq("user_id", context.userId)
        .maybeSingle();
      teamMember = (tm as MyContext["teamMember"]) ?? null;
    }

    return {
      userId: context.userId,
      orgOwnerId,
      role,
      isAdmin: role === "admin",
      teamMember,
    };
  });

export type OrgMember = {
  user_id: string;
  role: "admin" | "operator";
  email: string | null;
  team_member_id: string | null;
  team_member_name: string | null;
  team_id: string | null;
};

/** Admin: list users that belong to my org. */
export const listOrgMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OrgMember[]> => {
    // Verify admin
    const { data: me } = await context.supabase
      .from("user_roles")
      .select("role, org_owner_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    const orgOwnerId = me?.org_owner_id ?? context.userId;
    const isAdmin = !me || me.role === "admin";
    if (!isAdmin) throw new Error("Apenas admin pode listar membros");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("org_owner_id", orgOwnerId);
    if (error) throw new Error(error.message);

    const ids = (roleRows ?? []).map((r) => r.user_id);
    const userMap = new Map<string, string | null>();
    for (const id of ids) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(id);
      userMap.set(id, data.user?.email ?? null);
    }

    const { data: members } = await supabaseAdmin
      .from("team_members")
      .select("id, team_id, name, user_id")
      .eq("owner_id", orgOwnerId)
      .not("user_id", "is", null);
    const memberMap = new Map<string, { id: string; team_id: string; name: string }>(
      ((members ?? []) as { id: string; team_id: string; name: string; user_id: string }[]).map(
        (m) => [m.user_id, { id: m.id, team_id: m.team_id, name: m.name }],
      ),
    );

    return (roleRows ?? []).map((r) => {
      const tm = memberMap.get(r.user_id);
      return {
        user_id: r.user_id,
        role: r.role as "admin" | "operator",
        email: userMap.get(r.user_id) ?? null,
        team_member_id: tm?.id ?? null,
        team_member_name: tm?.name ?? null,
        team_id: tm?.team_id ?? null,
      };
    });
  });

/** Admin: invite an existing user (by email) as operator and link to a team member. */
export const linkOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        team_member_id: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    // Admin check
    const { data: me } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (me && me.role !== "admin") throw new Error("Apenas admin pode vincular operadores");
    const orgOwnerId = context.userId;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify the team_member belongs to this org
    const { data: tm, error: tmErr } = await supabaseAdmin
      .from("team_members")
      .select("id, owner_id, user_id")
      .eq("id", data.team_member_id)
      .maybeSingle();
    if (tmErr) throw new Error(tmErr.message);
    if (!tm || tm.owner_id !== orgOwnerId)
      throw new Error("Membro de equipe não encontrado");
    if (tm.user_id) throw new Error("Esse membro já está vinculado a uma conta");

    // Find auth user by email (paginated search).
    const normalized = data.email.trim().toLowerCase();
    let foundUserId: string | null = null;
    for (let page = 1; page <= 10; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
      if (hit) {
        foundUserId = hit.id;
        break;
      }
      if (list.users.length < 200) break;
    }
    if (!foundUserId)
      throw new Error("Nenhuma conta encontrada com esse email. Peça para o operador se cadastrar em /auth primeiro.");

    if (foundUserId === orgOwnerId) throw new Error("Você já é o admin desta conta");

    // Ensure user isn't admin of another org and not already in another org
    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("org_owner_id, role")
      .eq("user_id", foundUserId)
      .maybeSingle();
    if (existingRole && existingRole.org_owner_id !== orgOwnerId)
      throw new Error("Esta conta já pertence a outra empresa");

    // Upsert role + link team member
    const { error: upErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: foundUserId, org_owner_id: orgOwnerId, role: "operator" },
        { onConflict: "user_id" },
      );
    if (upErr) throw new Error(upErr.message);

    const { error: linkErr } = await supabaseAdmin
      .from("team_members")
      .update({ user_id: foundUserId })
      .eq("id", data.team_member_id);
    if (linkErr) throw new Error(linkErr.message);

    await supabaseAdmin.from("notifications").insert({
      owner_id: orgOwnerId,
      user_id: foundUserId,
      kind: "operator_linked",
      title: "Acesso de operador concedido",
      body: "Sua conta foi vinculada como operador. Faça login para começar.",
      link: "/agenda",
    });

    return { ok: true };
  });

/** Admin: remove operator access (unlink user from member + delete user_role). */
export const unlinkOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ user_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const orgOwnerId = context.userId;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("org_owner_id")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (!role || role.org_owner_id !== orgOwnerId)
      throw new Error("Operador não encontrado nesta empresa");

    await supabaseAdmin
      .from("team_members")
      .update({ user_id: null })
      .eq("user_id", data.user_id);

    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      owner_id: orgOwnerId,
      user_id: data.user_id,
      kind: "operator_unlinked",
      title: "Acesso de operador removido",
      body: "Seu acesso como operador foi revogado pelo administrador.",
      link: null,
    });

    return { ok: true };
  });

/**
 * Admin: invite a new operator by email.
 * - If the email already has an account, links it as operator (same as linkOperator).
 * - Otherwise creates the auth user and sends the Supabase invite email so the
 *   operator can set their own password.
 */
export const inviteOperator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        email: z.string().email().max(255),
        team_member_id: z.string().uuid(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: me } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (me && me.role !== "admin") throw new Error("Apenas admin pode convidar operadores");
    const orgOwnerId = context.userId;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify team member belongs to this org and isn't linked yet.
    const { data: tm, error: tmErr } = await supabaseAdmin
      .from("team_members")
      .select("id, owner_id, user_id")
      .eq("id", data.team_member_id)
      .maybeSingle();
    if (tmErr) throw new Error(tmErr.message);
    if (!tm || tm.owner_id !== orgOwnerId)
      throw new Error("Membro de equipe não encontrado");
    if (tm.user_id) throw new Error("Esse membro já está vinculado a uma conta");

    const normalized = data.email.trim().toLowerCase();

    // Look up existing user by email (paginated).
    let foundUserId: string | null = null;
    for (let page = 1; page <= 10; page++) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (error) throw new Error(error.message);
      const hit = list.users.find((u) => (u.email ?? "").toLowerCase() === normalized);
      if (hit) {
        foundUserId = hit.id;
        break;
      }
      if (list.users.length < 200) break;
    }

    let invited = false;
    if (!foundUserId) {
      // Send invite email — Supabase creates the user and emails a magic link
      // that drops the operator at /reset-password to set their password.
      const redirectTo =
        (process.env.PUBLIC_SITE_URL || process.env.SUPABASE_URL || "") + "/reset-password";
      const { data: invited2, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalized,
        { redirectTo: redirectTo || undefined },
      );
      if (invErr) throw new Error(invErr.message);
      foundUserId = invited2.user?.id ?? null;
      invited = true;
      if (!foundUserId) throw new Error("Não foi possível criar a conta do operador");
    }

    if (foundUserId === orgOwnerId) throw new Error("Você já é o admin desta conta");

    const { data: existingRole } = await supabaseAdmin
      .from("user_roles")
      .select("org_owner_id")
      .eq("user_id", foundUserId)
      .maybeSingle();
    if (existingRole && existingRole.org_owner_id !== orgOwnerId)
      throw new Error("Esta conta já pertence a outra empresa");

    const { error: upErr } = await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: foundUserId, org_owner_id: orgOwnerId, role: "operator" },
        { onConflict: "user_id" },
      );
    if (upErr) throw new Error(upErr.message);

    const { error: linkErr } = await supabaseAdmin
      .from("team_members")
      .update({ user_id: foundUserId })
      .eq("id", data.team_member_id);
    if (linkErr) throw new Error(linkErr.message);

    await supabaseAdmin.from("notifications").insert({
      owner_id: orgOwnerId,
      user_id: foundUserId,
      kind: "operator_linked",
      title: "Acesso de operador concedido",
      body: invited
        ? "Convite enviado por email. O operador define a senha pelo link."
        : "Conta vinculada como operador. Faça login para começar.",
      link: "/agenda",
    });

    return { ok: true, invited };
  });

/** Admin: resend the invite email to an operator who hasn't confirmed yet. */
export const resendOperatorInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ user_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: me } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (me && me.role !== "admin") throw new Error("Apenas admin pode reenviar convites");
    const orgOwnerId = context.userId;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Confirm operator belongs to this org.
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("org_owner_id, role")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (!role || role.org_owner_id !== orgOwnerId)
      throw new Error("Operador não encontrado nesta empresa");
    if (role.role !== "operator")
      throw new Error("Apenas operadores podem ser reconvidados");

    const { data: userRes, error: getErr } = await supabaseAdmin.auth.admin.getUserById(
      data.user_id,
    );
    if (getErr) throw new Error(getErr.message);
    const email = userRes.user?.email;
    if (!email) throw new Error("Operador sem email cadastrado");

    const redirectTo =
      (process.env.PUBLIC_SITE_URL || process.env.SUPABASE_URL || "") + "/reset-password";

    // If already confirmed, send a password-recovery link instead of a new invite.
    const alreadyConfirmed = !!userRes.user?.email_confirmed_at;
    if (alreadyConfirmed) {
      const { error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email,
        options: { redirectTo: redirectTo || undefined },
      });
      if (linkErr) throw new Error(linkErr.message);
      return { ok: true, kind: "recovery" as const };
    }

    const { error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: redirectTo || undefined,
    });
    if (invErr) throw new Error(invErr.message);
    return { ok: true, kind: "invite" as const };
  });