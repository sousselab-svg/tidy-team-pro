import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CompanySettings = {
  owner_id: string;
  company_name: string | null;
  pix_key: string | null;
  pix_instructions: string | null;
  logo_url: string | null;
  twilio_from_number: string | null;
  sms_confirmation_enabled: boolean;
  sms_reminder_24h_enabled: boolean;
  sms_reminder_2h_enabled: boolean;
  sms_review_request_enabled: boolean;
};

const SettingsInput = z.object({
  company_name: z.string().max(200).nullable().optional(),
  pix_key: z.string().max(200).nullable().optional(),
  pix_instructions: z.string().max(2000).nullable().optional(),
  logo_url: z.string().url().max(500).nullable().optional(),
  twilio_from_number: z
    .string()
    .regex(/^\+[1-9]\d{6,14}$/, "Use E.164 format, e.g. +14155551234")
    .nullable()
    .optional(),
  sms_confirmation_enabled: z.boolean().optional(),
  sms_reminder_24h_enabled: z.boolean().optional(),
  sms_reminder_2h_enabled: z.boolean().optional(),
  sms_review_request_enabled: z.boolean().optional(),
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