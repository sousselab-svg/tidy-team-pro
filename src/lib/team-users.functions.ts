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