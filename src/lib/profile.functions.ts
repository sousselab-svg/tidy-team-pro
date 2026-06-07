import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export type Profile = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  goals: string[];
  goals_other: string | null;
  onboarded_at: string | null;
};

export const getMyProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ profile: Profile | null }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, full_name, username, goals, goals_other, onboarded_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return { profile: (data as Profile | null) ?? null };
  });

const onboardSchema = z.object({
  full_name: z.string().trim().min(2).max(120),
  username: z
    .string()
    .trim()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Use letras, números, _ . -"),
  goals: z.array(z.string().min(1).max(60)).min(1).max(10),
  goals_other: z.string().trim().max(280).optional().nullable(),
});

export const completeOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => onboardSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // username uniqueness check
    const { data: existing, error: e1 } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("username", data.username)
      .neq("user_id", userId)
      .maybeSingle();
    if (e1) throw e1;
    if (existing) throw new Error("Esse nome de usuário já está em uso.");

    const payload = {
      user_id: userId,
      full_name: data.full_name,
      username: data.username,
      goals: data.goals,
      goals_other: data.goals_other ?? null,
      onboarded_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });
    if (error) throw error;
    return { ok: true as const };
  });