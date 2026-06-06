import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ClientCategory = "residential" | "commercial";

export type ClientRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  category: ClientCategory;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const ClientInput = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(200).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  category: z.enum(["residential", "commercial"]).default("residential"),
  notes: z.string().max(2000).nullable().optional(),
});

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ClientRow[]> => {
    const { data, error } = await context.supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as ClientRow[];
  });

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => ClientInput.parse(raw))
  .handler(async ({ context, data }): Promise<ClientRow> => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as ClientRow;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => z.object({ id: z.string().uuid() }).parse(raw))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });