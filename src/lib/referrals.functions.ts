import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ReferralRow = {
  id: string;
  referrer_client_id: string;
  referred_client_id: string | null;
  referred_name: string | null;
  referred_email: string | null;
  code: string;
  credit_cents: number;
  status: "pending" | "earned" | "redeemed" | "cancelled";
  earned_at: string | null;
  redeemed_at: string | null;
  created_at: string;
  referrer?: { name: string; referral_code: string | null } | null;
  referred?: { name: string } | null;
};

export type CreditRow = { client_id: string; balance_cents: number; client?: { name: string } | null };

export const listReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ReferralRow[]> => {
    const { data, error } = await context.supabase
      .from("referrals")
      .select(
        "*, referrer:clients!referrals_referrer_client_id_fkey(name, referral_code), referred:clients!referrals_referred_client_id_fkey(name)",
      )
      .order("created_at", { ascending: false });
    if (error) {
      // Fallback if FK aliases differ
      const { data: d2, error: e2 } = await context.supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false });
      if (e2) throw new Error(e2.message);
      return (d2 ?? []) as unknown as ReferralRow[];
    }
    return (data ?? []) as unknown as ReferralRow[];
  });

export const createReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        referrer_client_id: z.string().uuid(),
        referred_name: z.string().min(1).max(200),
        referred_email: z.string().email().max(200).optional().nullable(),
        credit_cents: z.number().int().min(0).max(1_000_000).default(2500),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: referrer } = await context.supabase
      .from("clients")
      .select("referral_code")
      .eq("id", data.referrer_client_id)
      .maybeSingle();
    const code = referrer?.referral_code ?? null;
    const { error } = await context.supabase.from("referrals").insert({
      owner_id: context.userId,
      referrer_client_id: data.referrer_client_id,
      referred_name: data.referred_name,
      referred_email: data.referred_email ?? null,
      credit_cents: data.credit_cents,
      code: code ?? "REF",
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const markReferralEarned = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        referred_client_id: z.string().uuid().nullable().optional(),
      })
      .parse(raw),
  )
  .handler(async ({ context, data }) => {
    const { data: ref, error } = await context.supabase
      .from("referrals")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error || !ref) throw new Error(error?.message || "Not found");
    if (ref.status !== "pending") throw new Error("Already processed");

    await context.supabase
      .from("referrals")
      .update({
        status: "earned",
        earned_at: new Date().toISOString(),
        referred_client_id: data.referred_client_id ?? ref.referred_client_id,
      })
      .eq("id", ref.id);

    // increment referrer credit balance
    const { data: existing } = await context.supabase
      .from("client_credits")
      .select("balance_cents")
      .eq("client_id", ref.referrer_client_id)
      .maybeSingle();
    const newBal = (existing?.balance_cents ?? 0) + ref.credit_cents;
    await context.supabase.from("client_credits").upsert(
      {
        client_id: ref.referrer_client_id,
        owner_id: context.userId,
        balance_cents: newBal,
      },
      { onConflict: "client_id" },
    );
    return { ok: true };
  });

export const cancelReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    await context.supabase
      .from("referrals")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    return { ok: true };
  });

export const listCredits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CreditRow[]> => {
    const { data, error } = await context.supabase
      .from("client_credits")
      .select("client_id, balance_cents, client:clients(name)")
      .gt("balance_cents", 0)
      .order("balance_cents", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as CreditRow[];
  });