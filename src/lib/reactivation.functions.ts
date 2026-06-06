import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InactiveClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  last_job_at: string | null;
};

export type CouponRow = {
  id: string;
  client_id: string;
  code: string;
  discount_cents: number;
  status: "sent" | "redeemed" | "expired" | "cancelled";
  expires_on: string;
  redeemed_at: string | null;
  created_at: string;
  client?: { name: string; email: string | null; phone: string | null } | null;
};

function randomCode(prefix = "WB") {
  const s = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}-${s}`;
}

export const listInactiveClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InactiveClient[]> => {
    const { data: settings } = await context.supabase
      .from("company_settings")
      .select("reactivation_days")
      .maybeSingle();
    const days = settings?.reactivation_days ?? 60;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const { data: clients, error } = await context.supabase
      .from("clients")
      .select("id, name, email, phone");
    if (error) throw new Error(error.message);

    const result: InactiveClient[] = [];
    for (const c of clients ?? []) {
      const { data: lastJob } = await context.supabase
        .from("jobs")
        .select("scheduled_at")
        .eq("client_id", c.id)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      const last = lastJob?.scheduled_at ? new Date(lastJob.scheduled_at) : null;
      if (!last || last < cutoff) {
        result.push({ ...c, last_job_at: lastJob?.scheduled_at ?? null });
      }
    }
    return result;
  });

export const listCoupons = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CouponRow[]> => {
    const { data, error } = await context.supabase
      .from("reactivation_coupons")
      .select("*, client:clients(name, email, phone)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CouponRow[];
  });

export const generateCouponForClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ client_id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: settings } = await context.supabase
      .from("company_settings")
      .select("reactivation_discount_cents")
      .maybeSingle();
    const discount = settings?.reactivation_discount_cents ?? 1500;
    const expires = new Date();
    expires.setDate(expires.getDate() + 30);
    const { error } = await context.supabase.from("reactivation_coupons").insert({
      owner_id: context.userId,
      client_id: data.client_id,
      code: randomCode("WB"),
      discount_cents: discount,
      expires_on: expires.toISOString().slice(0, 10),
      status: "sent",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const updateCouponStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["redeemed", "cancelled"]),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const patch: { status: "redeemed" | "cancelled"; redeemed_at?: string } = {
      status: data.status,
    };
    if (data.status === "redeemed") patch.redeemed_at = new Date().toISOString();
    const { error } = await context.supabase
      .from("reactivation_coupons")
      .update(patch)
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });