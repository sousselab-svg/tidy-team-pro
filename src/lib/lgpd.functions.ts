import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ConsentPreferences = {
  analytics: boolean;
  marketing: boolean;
  functional: boolean;
  policy_version: string;
  updated_at: string | null;
};

export type DSRKind = "export" | "deletion" | "rectification";
export type DSRStatus =
  | "pending"
  | "processing"
  | "completed"
  | "rejected"
  | "cancelled";

export type DataSubjectRequest = {
  id: string;
  kind: DSRKind;
  status: DSRStatus;
  notes: string | null;
  requested_at: string;
  completed_at: string | null;
};

const CURRENT_POLICY_VERSION = "1.0.0";

export const getMyConsent = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ConsentPreferences> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("consent_preferences")
      .select("analytics, marketing, functional, policy_version, updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (
      (data as ConsentPreferences | null) ?? {
        analytics: false,
        marketing: false,
        functional: true,
        policy_version: CURRENT_POLICY_VERSION,
        updated_at: null,
      }
    );
  });

export const updateMyConsent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (data: { analytics: boolean; marketing: boolean; functional: boolean }) => {
      if (
        typeof data?.analytics !== "boolean" ||
        typeof data?.marketing !== "boolean" ||
        typeof data?.functional !== "boolean"
      ) {
        throw new Error("invalid_consent_payload");
      }
      return data;
    },
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("consent_preferences")
      .upsert(
        {
          user_id: userId,
          analytics: data.analytics,
          marketing: data.marketing,
          functional: data.functional,
          policy_version: CURRENT_POLICY_VERSION,
        },
        { onConflict: "user_id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const listMyDataRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ requests: DataSubjectRequest[] }> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("data_subject_requests")
      .select("id, kind, status, notes, requested_at, completed_at")
      .eq("user_id", userId)
      .order("requested_at", { ascending: false });
    if (error) throw error;
    return { requests: (data ?? []) as DataSubjectRequest[] };
  });

export const createDataRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { kind: DSRKind; notes?: string }) => {
    if (!["export", "deletion", "rectification"].includes(data?.kind)) {
      throw new Error("invalid_kind");
    }
    if (data.notes && data.notes.length > 2000) {
      throw new Error("notes_too_long");
    }
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing, error: e0 } = await supabase
      .from("data_subject_requests")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", data.kind)
      .in("status", ["pending", "processing"])
      .maybeSingle();
    if (e0) throw e0;
    if (existing) {
      throw new Error("Já existe uma solicitação em andamento deste tipo.");
    }
    const { error } = await supabase.from("data_subject_requests").insert({
      user_id: userId,
      kind: data.kind,
      notes: data.notes?.trim() || null,
      status: "pending",
    });
    if (error) throw error;
    return { ok: true };
  });

export const cancelDataRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => {
    if (!data?.id || typeof data.id !== "string") throw new Error("invalid_id");
    return data;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("data_subject_requests")
      .update({ status: "cancelled", completed_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("user_id", userId)
      .eq("status", "pending");
    if (error) throw error;
    return { ok: true };
  });

export const exportMyDataNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [profile, consent, acceptances, clients, jobs, invoices, requests] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("consent_preferences").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("legal_acceptances").select("*").eq("user_id", userId),
        supabase.from("clients").select("*"),
        supabase.from("jobs").select("*"),
        supabase.from("invoices").select("*"),
        supabase.from("data_subject_requests").select("*").eq("user_id", userId),
      ]);
    const payload = {
      generated_at: new Date().toISOString(),
      user_id: userId,
      profile: profile.data ?? null,
      consent: consent.data ?? null,
      legal_acceptances: acceptances.data ?? [],
      clients: clients.data ?? [],
      jobs: jobs.data ?? [],
      invoices: invoices.data ?? [],
      data_subject_requests: requests.data ?? [],
    };
    // Log export as completed request
    await supabase.from("data_subject_requests").insert({
      user_id: userId,
      kind: "export",
      status: "completed",
      completed_at: new Date().toISOString(),
      notes: "Auto export via app",
    });
    return payload;
  });