import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const MAX_ATTEMPTS = 3;

export type SmsKind = "confirmation" | "reminder_24h" | "reminder_2h" | "review" | "manual";

async function sendViaTwilio(opts: { to: string; from: string; body: string }): Promise<{ sid: string }> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const twilioKey = process.env.TWILIO_API_KEY;
  if (!lovableKey) throw new Error("LOVABLE_API_KEY missing");
  if (!twilioKey) throw new Error("TWILIO_API_KEY missing (connect Twilio)");

  const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": twilioKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: opts.to, From: opts.from, Body: opts.body }),
  });
  const data = (await res.json()) as { sid?: string; message?: string; code?: number };
  if (!res.ok) {
    throw new Error(`Twilio ${res.status}: ${data.message ?? "send failed"}`);
  }
  return { sid: data.sid ?? "" };
}

function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (/^\+[1-9]\d{6,14}$/.test(trimmed)) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`; // assume US
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

function renderBody(kind: SmsKind, ctx: {
  company: string;
  clientName: string;
  title: string;
  whenLocal: string;
  address: string | null;
}): string {
  switch (kind) {
    case "confirmation":
      return `${ctx.company}: Hi ${ctx.clientName}, your ${ctx.title} is booked for ${ctx.whenLocal}${ctx.address ? ` at ${ctx.address}` : ""}. Reply STOP to opt out.`;
    case "reminder_24h":
      return `${ctx.company} reminder: ${ctx.title} tomorrow at ${ctx.whenLocal}${ctx.address ? ` (${ctx.address})` : ""}. Reply STOP to opt out.`;
    case "reminder_2h":
      return `${ctx.company}: We'll see you in ~2h for ${ctx.title} at ${ctx.whenLocal}. Reply STOP to opt out.`;
    case "review":
      return `${ctx.company}: Thanks ${ctx.clientName}! How did we do today? Reply 1-10 or leave a review. Reply STOP to opt out.`;
    default:
      return ctx.title;
  }
}

type CompanyCfg = {
  owner_id: string;
  company_name: string | null;
  twilio_from_number: string | null;
  sms_confirmation_enabled: boolean;
  sms_reminder_24h_enabled: boolean;
  sms_reminder_2h_enabled: boolean;
  sms_review_request_enabled: boolean;
};

async function loadCompany(ownerId: string): Promise<CompanyCfg | null> {
  const { data } = await supabaseAdmin
    .from("company_settings")
    .select(
      "owner_id, company_name, twilio_from_number, sms_confirmation_enabled, sms_reminder_24h_enabled, sms_reminder_2h_enabled, sms_review_request_enabled",
    )
    .eq("owner_id", ownerId)
    .maybeSingle();
  return (data as CompanyCfg | null) ?? null;
}

function kindEnabled(cfg: CompanyCfg, kind: SmsKind): boolean {
  if (kind === "confirmation") return cfg.sms_confirmation_enabled;
  if (kind === "reminder_24h") return cfg.sms_reminder_24h_enabled;
  if (kind === "reminder_2h") return cfg.sms_reminder_2h_enabled;
  if (kind === "review") return cfg.sms_review_request_enabled;
  return true;
}

/**
 * Enqueue (idempotent per job+kind) and optionally fire immediately.
 * Returns the row id, or null when skipped (disabled/no phone/no From).
 */
export async function enqueueSmsForJob(
  jobId: string,
  kind: SmsKind,
  opts: { fireNow?: boolean; scheduledFor?: Date } = {},
): Promise<string | null> {
  const { data: job } = await supabaseAdmin
    .from("jobs")
    .select("id, owner_id, client_id, title, address, scheduled_at")
    .eq("id", jobId)
    .maybeSingle();
  if (!job) return null;

  const cfg = await loadCompany(job.owner_id);
  if (!cfg || !cfg.twilio_from_number || !kindEnabled(cfg, kind)) return null;

  const { data: client } = await supabaseAdmin
    .from("clients")
    .select("id, name, phone")
    .eq("id", job.client_id ?? "")
    .maybeSingle();
  const to = normalizePhone(client?.phone ?? null);
  if (!client || !to) return null;

  const whenLocal = new Date(job.scheduled_at).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const body = renderBody(kind, {
    company: cfg.company_name ?? "Service",
    clientName: client.name,
    title: job.title,
    whenLocal,
    address: job.address,
  });

  const { data: row, error } = await supabaseAdmin
    .from("sms_messages")
    .upsert(
      {
        owner_id: job.owner_id,
        job_id: job.id,
        client_id: client.id,
        to_number: to,
        from_number: cfg.twilio_from_number,
        body,
        kind,
        status: "queued",
        scheduled_for: (opts.scheduledFor ?? new Date()).toISOString(),
      },
      { onConflict: "job_id,kind", ignoreDuplicates: true },
    )
    .select("id")
    .maybeSingle();
  if (error || !row) return null;

  if (opts.fireNow) {
    await dispatchRow(row.id);
  }
  return row.id;
}

async function dispatchRow(id: string): Promise<void> {
  const { data: row } = await supabaseAdmin
    .from("sms_messages")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!row || row.status === "sent") return;
  if ((row.attempts ?? 0) >= MAX_ATTEMPTS) {
    await supabaseAdmin
      .from("sms_messages")
      .update({ status: "failed" })
      .eq("id", id);
    return;
  }
  try {
    const { sid } = await sendViaTwilio({
      to: row.to_number,
      from: row.from_number ?? "",
      body: row.body,
    });
    await supabaseAdmin
      .from("sms_messages")
      .update({
        status: "sent",
        provider_sid: sid,
        sent_at: new Date().toISOString(),
        attempts: (row.attempts ?? 0) + 1,
        error: null,
      })
      .eq("id", id);
  } catch (e) {
    const attempts = (row.attempts ?? 0) + 1;
    await supabaseAdmin
      .from("sms_messages")
      .update({
        status: attempts >= MAX_ATTEMPTS ? "failed" : "queued",
        attempts,
        error: e instanceof Error ? e.message : String(e),
      })
      .eq("id", id);
  }
}

/** Process pending (queued, due) SMS rows. Used by the cron. */
export async function processPendingSms(limit = 50): Promise<{ sent: number; failed: number }> {
  const nowIso = new Date().toISOString();
  const { data: rows } = await supabaseAdmin
    .from("sms_messages")
    .select("id")
    .eq("status", "queued")
    .lte("scheduled_for", nowIso)
    .lt("attempts", MAX_ATTEMPTS)
    .order("scheduled_for", { ascending: true })
    .limit(limit);

  let sent = 0;
  let failed = 0;
  for (const r of rows ?? []) {
    await dispatchRow(r.id);
    const { data: after } = await supabaseAdmin
      .from("sms_messages")
      .select("status")
      .eq("id", r.id)
      .maybeSingle();
    if (after?.status === "sent") sent++;
    else if (after?.status === "failed") failed++;
  }
  return { sent, failed };
}

/** Enqueue reminders for jobs landing in ~24h and ~2h windows. Idempotent. */
export async function enqueueUpcomingReminders(): Promise<{ enqueued24h: number; enqueued2h: number }> {
  const now = new Date();
  const in24hStart = new Date(now.getTime() + 24 * 60 * 60 * 1000 - 15 * 60 * 1000);
  const in24hEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000);
  const in2hStart = new Date(now.getTime() + 2 * 60 * 60 * 1000 - 15 * 60 * 1000);
  const in2hEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000 + 30 * 60 * 1000);

  let enqueued24h = 0;
  let enqueued2h = 0;

  const { data: jobs24 } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .neq("status", "cancelled")
    .gte("scheduled_at", in24hStart.toISOString())
    .lte("scheduled_at", in24hEnd.toISOString());
  for (const j of jobs24 ?? []) {
    const id = await enqueueSmsForJob(j.id, "reminder_24h", { fireNow: false });
    if (id) enqueued24h++;
  }

  const { data: jobs2 } = await supabaseAdmin
    .from("jobs")
    .select("id")
    .neq("status", "cancelled")
    .gte("scheduled_at", in2hStart.toISOString())
    .lte("scheduled_at", in2hEnd.toISOString());
  for (const j of jobs2 ?? []) {
    const id = await enqueueSmsForJob(j.id, "reminder_2h", { fireNow: false });
    if (id) enqueued2h++;
  }

  return { enqueued24h, enqueued2h };
}