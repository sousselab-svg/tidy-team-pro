import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CompanySettings = {
  owner_id: string;
  company_name: string | null;
  pix_key: string | null;
  pix_instructions: string | null;
  logo_url: string | null;
};

const SettingsInput = z.object({
  company_name: z.string().max(200).nullable().optional(),
  pix_key: z.string().max(200).nullable().optional(),
  pix_instructions: z.string().max(2000).nullable().optional(),
  logo_url: z.string().url().max(500).nullable().optional(),
});

export const getSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CompanySettings | null> => {
    const { data, error } = await context.supabase
      .from("company_settings")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data as CompanySettings | null) ?? null;
  });

export const saveSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw: unknown) => SettingsInput.parse(raw))
  .handler(async ({ context, data }): Promise<CompanySettings> => {
    const { data: row, error } = await context.supabase
      .from("company_settings")
      .upsert({ owner_id: context.userId, ...data }, { onConflict: "owner_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return row as CompanySettings;
  });