import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type QuoteStatus = "draft" | "sent" | "approved" | "rejected";

export type QuoteItem = { description: string; qty: number; unit_price_cents: number };

export type QuoteRow = {
  id: string;
  client_id: string;
  title: string;
  items: QuoteItem[];
  total_cents: number;
  status: QuoteStatus;
  valid_until: string | null;
  notes: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
  client?: { name: string; portal_token: string } | null;
};

const ItemSchema = z.object({
  description: z.string().min(1).max(200),
  qty: z.number().min(0.01).max(10000),
  unit_price_cents: z.number().int().min(0).max(100_000_000),
});

const QuoteInput = z.object({
  client_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  items: z.array(ItemSchema).min(1).max(50),
  valid_until: z.string().date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

function computeTotal(items: QuoteItem[]) {
  return items.reduce((s, it) => s + Math.round(it.qty * it.unit_price_cents), 0);
}

export const listQuotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<QuoteRow[]> => {
    const { data, error } = await context.supabase
      .from("quotes")
      .select("*, client:clients(name, portal_token)")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as unknown as QuoteRow[];
  });

export const createQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => QuoteInput.parse(raw))
  .handler(async ({ context, data }): Promise<QuoteRow> => {
    const total = computeTotal(data.items);
    const { data: row, error } = await context.supabase
      .from("quotes")
      .insert({
        owner_id: context.userId,
        client_id: data.client_id,
        title: data.title,
        items: data.items,
        total_cents: total,
        valid_until: data.valid_until ?? null,
        notes: data.notes ?? null,
        status: "draft",
      })
      .select("*, client:clients(name, portal_token)")
      .single();
    if (error) throw new Error(error.message);
    return row as unknown as QuoteRow;
  });

export const sendQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("quotes")
      .update({ status: "sent" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteQuote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("quotes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });