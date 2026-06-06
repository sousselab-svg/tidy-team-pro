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
  team_id: string | null;
  checklist: ChecklistItem[];
  notes: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius_m: number;
  auto_check_in_enabled: boolean;
  arrived_at: string | null;
  signature_path: string | null;
  signed_by_name: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  client?: { name: string } | null;
  team?: { id: string; name: string; color: string | null } | null;
};

export type ChecklistItem = { id: string; label: string; done: boolean };

const JobInput = z.object({
  client_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  address: z.string().max(500).nullable().optional(),
  scheduled_at: z.string().datetime(),
  duration_minutes: z.number().int().min(15).max(8 * 60).default(90),
  price_cents: z.number().int().min(0).default(0),
  team_name: z.string().max(100).nullable().optional(),
  team_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

const JobUpdateInput = z.object({
  id: z.string().uuid(),
  patch: z.object({
    client_id: z.string().uuid().nullable().optional(),
    title: z.string().min(1).max(200).optional(),
    address: z.string().max(500).nullable().optional(),
    scheduled_at: z.string().datetime().optional(),
    duration_minutes: z.number().int().min(15).max(8 * 60).optional(),
    price_cents: z.number().int().min(0).optional(),
    team_name: z.string().max(100).nullable().optional(),
    team_id: z.string().uuid().nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    geofence_radius_m: z.number().int().min(20).max(2000).optional(),
    auto_check_in_enabled: z.boolean().optional(),
    status: z
      .enum(["scheduled", "on_way", "in_progress", "completed", "cancelled"])
      .optional(),
  }),
});

const ChecklistSchema = z.array(
  z.object({
    id: z.string().min(1).max(40),
    label: z.string().min(1).max(200),
    done: z.boolean(),
  }),
).max(100);

export const listJobs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<JobRow[]> => {
    const { data, error } = await context.supabase
      .from("jobs")
      .select("*, client:clients(name), team:teams(id, name, color)")
      .order("scheduled_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as JobRow[];
  });

export const getJob = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }): Promise<JobRow | null> => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .select("*, client:clients(name), team:teams(id, name, color)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as unknown as JobRow | null) ?? null;
  });

export const updateJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => JobUpdateInput.parse(raw))
  .handler(async ({ context, data }): Promise<JobRow> => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .update(data.patch)
      .eq("id", data.id)
      .select("*, client:clients(name), team:teams(id, name, color)")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as JobRow;
  });

export const createJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => JobInput.parse(raw))
  .handler(async ({ context, data }): Promise<JobRow> => {
    const { data: row, error } = await context.supabase
      .from("jobs")
      .insert({ ...data, owner_id: context.userId })
      .select("*, client:clients(name), team:teams(id, name, color)")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as JobRow;
  });

export const updateJobChecklist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z.object({ id: z.string().uuid(), checklist: ChecklistSchema }).parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("jobs")
      .update({ checklist: data.checklist })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
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

    // Auto-create invoice when job is completed (only once, only if priced and has client)
    let createdInvoice = false;
    if (data.status === "completed") {
      const { data: job } = await context.supabase
        .from("jobs")
        .select("id, client_id, title, price_cents")
        .eq("id", data.id)
        .maybeSingle();
      if (job && job.client_id && job.price_cents > 0) {
        const { data: existing } = await context.supabase
          .from("invoices")
          .select("id")
          .eq("job_id", job.id)
          .neq("status", "cancelled")
          .maybeSingle();
        if (!existing) {
          const { error: invErr } = await context.supabase.from("invoices").insert({
            owner_id: context.userId,
            client_id: job.client_id,
            job_id: job.id,
            title: job.title,
            amount_cents: job.price_cents,
            status: "open",
          });
          if (!invErr) createdInvoice = true;
        }
      }
    }
    return { ok: true, createdInvoice };
  });

export const deleteJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("jobs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });