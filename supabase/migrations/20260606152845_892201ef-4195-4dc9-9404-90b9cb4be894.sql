CREATE TABLE public.sms_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  job_id uuid,
  client_id uuid,
  to_number text NOT NULL,
  from_number text,
  body text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('confirmation','reminder_24h','reminder_2h','review','manual')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed','skipped')),
  provider_sid text,
  error text,
  attempts integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX sms_messages_job_kind_uniq
  ON public.sms_messages (job_id, kind)
  WHERE job_id IS NOT NULL AND kind <> 'manual';

CREATE INDEX sms_messages_owner_idx ON public.sms_messages (owner_id, created_at DESC);
CREATE INDEX sms_messages_status_idx ON public.sms_messages (status, scheduled_for);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sms_messages TO authenticated;
GRANT ALL ON public.sms_messages TO service_role;

ALTER TABLE public.sms_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org reads sms" ON public.sms_messages
  FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));

CREATE POLICY "admin manages sms" ON public.sms_messages
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

CREATE TRIGGER sms_messages_updated_at
  BEFORE UPDATE ON public.sms_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();