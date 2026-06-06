import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type JobStatus =
  | "scheduled"
  | "on_way"
  | "in_progress"
  | "completed"
  | "cancelled";

export type JobRow = {
  id: string;
  client_id: string | null;
  title: string;
  address: string | null;
  scheduled_at: string;
  duration_minutes: number;
  price_cents: number;
  status: JobStatus;
  team_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: { name: string } | null;
};

const JobInput = z.object({
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(8 * 60).default(90),
  price_cents: z.number().int().min(0).default(0),
  team_name: z.string().max(100).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JobRow[]> => {
    const { data, error } = await context.supabase
      .from("jobs")
      .select("*, client:clients(name)")
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as JobRow[];
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => JobInput.parse(raw))
  .handler(async ({ context, data }): Promise<JobRow> => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .insert({ ...data, owner_id: context.userId })
      .select("*, client:clients(name)")
      .single();
    if (error) throw new Error(error.message);
    return row as JobRow;
  });

export const updateJobStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["scheduled", "on_way", "in_progress", "completed", "cancelled"]),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("jobs")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });