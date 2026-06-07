import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type TeamMember = {
  id: string;
  team_id: string;
  name: string;
  phone: string | null;
  role: string | null;
  user_id: string | null;
};

export type TeamRow = {
  id: string;
  name: string;
  color: string | null;
  members: TeamMember[];
};

const TeamInput = z.object({
  name: z.string().min(1).max(80),
  color: z.string().max(20).nullable().optional(),
});

const MemberInput = z.object({
  team_id: z.string().uuid(),
  name: z.string().min(1).max(120),
  phone: z.string().max(40).nullable().optional(),
  role: z.string().max(80).nullable().optional(),
});

export const listTeams = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<TeamRow[]> => {
    const { data, error } = await context.supabase
      .from("teams")
      .select("id, name, color, members:team_members(id, team_id, name, phone, role, user_id)")
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as TeamRow[];
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => TeamInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { data: row, error } = await context.supabase
      .from("teams")
      .insert({ owner_id: context.userId, name: data.name, color: data.color ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), name: z.string().min(1).max(80), color: z.string().max(20).nullable().optional() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("teams")
      .update({ name: data.name, color: data.color ?? null })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeam = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("teams").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => MemberInput.parse(raw))
  .handler(async ({ context, data }) => {
    const { data: inserted, error } = await context.supabase.from("team_members").insert({
      owner_id: context.userId,
      team_id: data.team_id,
      name: data.name,
      phone: data.phone ?? null,
      role: data.role ?? null,
    }).select("id, user_id").single();
    if (error) throw new Error(error.message);
    if (inserted?.user_id) {
      const { data: team } = await context.supabase.from("teams").select("name").eq("id", data.team_id).maybeSingle();
      await context.supabase.from("notifications").insert({
        owner_id: context.userId,
        user_id: inserted.user_id,
        kind: "team_linked",
        title: "Você foi adicionado a uma equipe",
        body: team?.name ? `Agora você faz parte da equipe "${team.name}".` : "Você foi adicionado a uma nova equipe.",
        link: "/equipe",
      });
    }
    return { ok: true };
  });

export const removeTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: existing } = await context.supabase
      .from("team_members")
      .select("user_id, team_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase.from("team_members").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (existing?.user_id) {
      const { data: team } = await context.supabase.from("teams").select("name").eq("id", existing.team_id).maybeSingle();
      await context.supabase.from("notifications").insert({
        owner_id: context.userId,
        user_id: existing.user_id,
        kind: "team_unlinked",
        title: "Você foi removido de uma equipe",
        body: team?.name ? `Você não faz mais parte da equipe "${team.name}".` : "Você foi removido de uma equipe.",
        link: "/equipe",
      });
    }
    return { ok: true };
  });

export const moveTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), team_id: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: prev } = await context.supabase
      .from("team_members")
      .select("user_id, team_id")
      .eq("id", data.id)
      .maybeSingle();
    const { error } = await context.supabase
      .from("team_members")
      .update({ team_id: data.team_id })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    if (prev?.user_id && prev.team_id !== data.team_id) {
      const { data: teams } = await context.supabase
        .from("teams")
        .select("id, name")
        .in("id", [prev.team_id, data.team_id]);
      const fromName = teams?.find((t) => t.id === prev.team_id)?.name ?? "equipe anterior";
      const toName = teams?.find((t) => t.id === data.team_id)?.name ?? "nova equipe";
      await context.supabase.from("notifications").insert({
        owner_id: context.userId,
        user_id: prev.user_id,
        kind: "team_moved",
        title: "Você foi movido de equipe",
        body: `De "${fromName}" para "${toName}".`,
        link: "/equipe",
      });
    }
    return { ok: true };
  });