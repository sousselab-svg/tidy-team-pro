import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { QuoteItem } from "./quotes.functions";

export type PortalClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export type PortalCompany = {
  company_name: string | null;
  pix_key: string | null;
  pix_instructions: string | null;
  logo_url: string | null;
};

export type PortalJob = {
  id: string;
  title: string;
  address: string | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
};

export type PortalQuote = {
  id: string;
  title: string;
  items: QuoteItem[];
  total_cents: number;
  status: "sent" | "approved" | "rejected";
  valid_until: string | null;
  notes: string | null;
  approved_at: string | null;
};

export type PortalInvoice = {
  id: string;
  title: string;
  amount_cents: number;
  status: "open" | "paid" | "cancelled";
  due_date: string | null;
  payment_proof_path: string | null;
  confirmed_at: string | null;
};

export type PortalData = {
  client: PortalClient;
  company: PortalCompany;
  upcomingJobs: PortalJob[];
  pendingQuotes: PortalQuote[];
  openInvoices: PortalInvoice[];
};

const TokenSchema = z.string().uuid();

async function resolveClient(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("clients")
    .select("id, owner_id, name, email, phone")
    .eq("portal_token", token)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Link inválido ou expirado");
  return { client: data, supabaseAdmin };
}

export const getPortalData = createServerFn({ method: "GET" })
  .inputValidator((raw: unknown) => z.object({ token: TokenSchema }).parse(raw))
  .handler(async ({ data }): Promise<PortalData> => {
    const { client, supabaseAdmin } = await resolveClient(data.token);
    const nowIso = new Date().toISOString();

    const [companyRes, jobsRes, quotesRes, invoicesRes] = await Promise.all([
      supabaseAdmin
        .from("company_settings")
        .select("company_name, pix_key, pix_instructions, logo_url")
        .eq("owner_id", client.owner_id)
        .maybeSingle(),
      supabaseAdmin
        .from("jobs")
        .select("id, title, address, scheduled_at, duration_minutes, status")
        .eq("client_id", client.id)
        .gte("scheduled_at", nowIso)
        .neq("status", "cancelled")
        .order("scheduled_at", { ascending: true })
        .limit(20),
      supabaseAdmin
        .from("quotes")
        .select("id, title, items, total_cents, status, valid_until, notes, approved_at")
        .eq("client_id", client.id)
        .in("status", ["sent", "approved", "rejected"])
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("invoices")
        .select("id, title, amount_cents, status, due_date, payment_proof_path, confirmed_at")
        .eq("client_id", client.id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false }),
    ]);

    if (companyRes.error) throw new Error(companyRes.error.message);
    if (jobsRes.error) throw new Error(jobsRes.error.message);
    if (quotesRes.error) throw new Error(quotesRes.error.message);
    if (invoicesRes.error) throw new Error(invoicesRes.error.message);

    return {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
      company: (companyRes.data as PortalCompany) ?? {
        company_name: null,
        pix_key: null,
        pix_instructions: null,
        logo_url: null,
      },
      upcomingJobs: (jobsRes.data ?? []) as PortalJob[],
      pendingQuotes: (quotesRes.data ?? []) as unknown as PortalQuote[],
      openInvoices: (invoicesRes.data ?? []) as PortalInvoice[],
    };
  });

export const approveQuote = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ token: TokenSchema, quoteId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { client, supabaseAdmin } = await resolveClient(data.token);
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("id, client_id, status")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!quote || quote.client_id !== client.id) throw new Error("Orçamento não encontrado");
    if (quote.status !== "sent") throw new Error("Orçamento já processado");

    const { error } = await supabaseAdmin
      .from("quotes")
      .update({ status: "approved", approved_at: new Date().toISOString() })
      .eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const rejectQuote = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ token: TokenSchema, quoteId: z.string().uuid() }).parse(raw),
  )
  .handler(async ({ data }) => {
    const { client, supabaseAdmin } = await resolveClient(data.token);
    const { data: quote, error: qErr } = await supabaseAdmin
      .from("quotes")
      .select("id, client_id, status")
      .eq("id", data.quoteId)
      .maybeSingle();
    if (qErr) throw new Error(qErr.message);
    if (!quote || quote.client_id !== client.id) throw new Error("Orçamento não encontrado");
    if (quote.status !== "sent") throw new Error("Orçamento já processado");

    const { error } = await supabaseAdmin
      .from("quotes")
      .update({ status: "rejected" })
      .eq("id", data.quoteId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const MAX_PROOF_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;

export const submitPaymentProof = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z
      .object({
        token: TokenSchema,
        invoiceId: z.string().uuid(),
        fileBase64: z.string().min(1).max(8 * 1024 * 1024),
        contentType: z.enum(ALLOWED_MIME),
        fileName: z.string().min(1).max(200),
      })
      .parse(raw),
  )
  .handler(async ({ data }) => {
    const { client, supabaseAdmin } = await resolveClient(data.token);

    const { data: invoice, error: iErr } = await supabaseAdmin
      .from("invoices")
      .select("id, client_id, owner_id, status")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (iErr) throw new Error(iErr.message);
    if (!invoice || invoice.client_id !== client.id) throw new Error("Fatura não encontrada");
    if (invoice.status !== "open") throw new Error("Fatura não está em aberto");

    const buffer = Buffer.from(data.fileBase64, "base64");
    if (buffer.byteLength === 0 || buffer.byteLength > MAX_PROOF_BYTES) {
      throw new Error("Arquivo inválido (máx 5MB)");
    }

    const ext = data.fileName.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
    const path = `${invoice.owner_id}/${invoice.id}/${Date.now()}.${ext}`;

    const { error: upErr } = await supabaseAdmin.storage
      .from("payment-proofs")
      .upload(path, buffer, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);

    const { error: updErr } = await supabaseAdmin
      .from("invoices")
      .update({ payment_proof_path: path })
      .eq("id", data.invoiceId);
    if (updErr) throw new Error(updErr.message);

    return { ok: true };
  });