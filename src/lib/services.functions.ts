import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ServiceItem = {
  id: string;
  name: string;
  description: string | null;
  default_price_cents: number;
  default_duration_minutes: number;
  category: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export const listServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { onlyActive?: boolean } | undefined) => ({ onlyActive: !!data?.onlyActive }))
  .handler(async ({ data, context }): Promise<ServiceItem[]> => {
    let q = context.supabase
      .from("service_catalog")
      .select("*")
      .order("name", { ascending: true });
    if (data.onlyActive) q = q.eq("active", true);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return (rows ?? []) as ServiceItem[];
  });

export const upsertService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: {
    id?: string;
    name: string;
    description?: string | null;
    default_price_cents: number;
    default_duration_minutes: number;
    category?: string | null;
    active?: boolean;
  }) => {
    const name = (data.name ?? "").trim();
    if (!name || name.length > 200) throw new Error("Nome inválido");
    const price = Math.max(0, Math.round(data.default_price_cents ?? 0));
    const duration = Math.max(1, Math.min(24 * 60, Math.round(data.default_duration_minutes ?? 60)));
    return {
      id: data.id,
      name,
      description: data.description?.toString().slice(0, 2000) ?? null,
      default_price_cents: price,
      default_duration_minutes: duration,
      category: data.category?.toString().slice(0, 100) ?? null,
      active: data.active ?? true,
    };
  })
  .handler(async ({ data, context }): Promise<ServiceItem> => {
    const payload = {
      owner_id: context.userId,
      name: data.name,
      description: data.description,
      default_price_cents: data.default_price_cents,
      default_duration_minutes: data.default_duration_minutes,
      category: data.category,
      active: data.active,
    };
    const q = data.id
      ? context.supabase.from("service_catalog").update(payload).eq("id", data.id).select("*").single()
      : context.supabase.from("service_catalog").insert(payload).select("*").single();
    const { data: row, error } = await q;
    if (error) throw new Error(error.message);
    return row as ServiceItem;
  });

export const deleteService = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { id: string }) => data)
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("service_catalog").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });