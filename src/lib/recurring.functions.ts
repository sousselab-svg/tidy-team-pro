import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type Frequency = "weekly" | "biweekly" | "monthly";

export type RecurringRow = {
  id: string;
  client_id: string;
  title: string;
  address: string | null;
  price_cents: number;
  duration_minutes: number;
  team_id: string | null;
  notes: string | null;
  frequency: Frequency;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string;
  next_run_on: string;
  active: boolean;
  last_generated_at: string | null;
  created_at: string;
  client?: { name: string } | null;
  team?: { id: string; name: string; color: string | null } | null;
};

const Input = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  price_cents: z.number().int().min(0).default(0),
  duration_minutes: z.number().int().min(15).max(480).default(90),
  team_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  frequency: z.enum(["weekly", "biweekly", "monthly"]),
  day_of_week: z.number().int().min(0).max(6).nullable().optional(),
  day_of_month: z.number().int().min(1).max(28).nullable().optional(),
  time_of_day: z.string().regex(/^\d{2}:\d{2}$/).default("09:00"),
  next_run_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  active: z.boolean().default(true),
});

export function computeNextRunOn(current: Date, freq: Frequency): Date {
  const d = new Date(current);
  if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export const listRecurring = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<RecurringRow[]> => {
    const { data, error } = await context.supabase
      .from("recurring_schedules")
      .select("*, client:clients(name), team:teams(id, name, color)")
      .order("next_run_on", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as RecurringRow[];
  });

export const createRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => Input.parse(raw))
  .handler(async ({ context, data }): Promise<RecurringRow> => {
    const { data: row, error } = await context.supabase
      .from("recurring_schedules")
      .insert({ ...data, owner_id: context.userId })
      .select("*, client:clients(name), team:teams(id, name, color)")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as RecurringRow;
  });

export const updateRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), active: z.boolean() }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("recurring_schedules")
      .update({ active: data.active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteRecurring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("recurring_schedules")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const runRecurringNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: s, error } = await context.supabase
      .from("recurring_schedules")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !s) throw new Error(error?.message || "Not found");
    const scheduled = new Date(`${s.next_run_on}T${s.time_of_day}`);
    const { error: jobErr } = await context.supabase.from("jobs").insert({
      owner_id: context.userId,
      client_id: s.client_id,
      title: s.title,
      address: s.address,
      scheduled_at: scheduled.toISOString(),
      duration_minutes: s.duration_minutes,
      price_cents: s.price_cents,
      team_id: s.team_id,
      notes: s.notes,
    });
    if (jobErr) throw new Error(jobErr.message);
    const next = computeNextRunOn(scheduled, s.frequency as Frequency);
    await context.supabase
      .from("recurring_schedules")
      .update({
        next_run_on: next.toISOString().slice(0, 10),
        last_generated_at: new Date().toISOString(),
      })
      .eq("id", s.id);
    return { ok: true };
  });