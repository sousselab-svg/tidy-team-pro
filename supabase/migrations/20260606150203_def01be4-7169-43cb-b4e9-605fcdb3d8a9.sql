ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS twilio_from_number text,
  ADD COLUMN IF NOT EXISTS sms_confirmation_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_reminder_24h_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_reminder_2h_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sms_review_request_enabled boolean NOT NULL DEFAULT true;