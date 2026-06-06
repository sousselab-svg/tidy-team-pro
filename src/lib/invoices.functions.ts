import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type InvoiceStatus = "open" | "paid" | "cancelled";

export type InvoiceRow = {
  id: string;
  client_id: string;
  quote_id: string | null;
  job_id: string | null;
  title: string;
  amount_cents: number;
  status: InvoiceStatus;
  due_date: string | null;
  paid_at: string | null;
  payment_proof_path: string | null;
  confirmed_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  client?: { name: string; portal_token: string } | null;
};

const InvoiceInput = z.object({
  client_id: z.string().uuid(),
  quote_id: z.string().uuid().nullable().optional(),
  job_id: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(200),
  amount_cents: z.number().int().min(0).max(100_000_000),
  due_date: z.string().date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

export const listInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<InvoiceRow[]> => {
    const { data, error } = await context.supabase
      .from("invoices")
      .select("*, client:clients(name, portal_token)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as InvoiceRow[];
  });

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => InvoiceInput.parse(raw))
  .handler(async ({ context, data }): Promise<InvoiceRow> => {
    const { data: row, error } = await context.supabase
      .from("invoices")
      .insert({
        owner_id: context.userId,
        client_id: data.client_id,
        quote_id: data.quote_id ?? null,
        job_id: data.job_id ?? null,
        title: data.title,
        amount_cents: data.amount_cents,
        due_date: data.due_date ?? null,
        notes: data.notes ?? null,
        status: "open",
      })
      .select("*, client:clients(name, portal_token)")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as InvoiceRow;
  });

export const confirmInvoicePayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("invoices")
      .update({ status: "paid", paid_at: new Date().toISOString(), confirmed_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const cancelInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("invoices").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getProofSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ path: z.string().min(1).max(500) }).parse(raw))
  .handler(async ({ context, data }) => {
    const { data: signed, error } = await context.supabase.storage
      .from("payment-proofs")
      .createSignedUrl(data.path, 60 * 10);
    if (error) throw new Error(error.message);
    return { url: signed.signedUrl };
  });