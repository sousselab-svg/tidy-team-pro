
-- Consent preferences per user (LGPD/GDPR)
CREATE TABLE public.consent_preferences (
  user_id uuid NOT NULL PRIMARY KEY,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  functional boolean NOT NULL DEFAULT true,
  policy_version text NOT NULL DEFAULT '1.0.0',
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consent_preferences TO authenticated;
GRANT ALL ON public.consent_preferences TO service_role;
ALTER TABLE public.consent_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own consent" ON public.consent_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user inserts own consent" ON public.consent_preferences FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user updates own consent" ON public.consent_preferences FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER consent_preferences_set_updated_at
BEFORE UPDATE ON public.consent_preferences
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Data Subject Requests (export, deletion, rectification)
CREATE TABLE public.data_subject_requests (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('export','deletion','rectification')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','rejected','cancelled')),
  notes text,
  payload jsonb,
  requested_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.data_subject_requests TO authenticated;
GRANT ALL ON public.data_subject_requests TO service_role;
ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user reads own dsr" ON public.data_subject_requests FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "user creates own dsr" ON public.data_subject_requests FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "user cancels own dsr" ON public.data_subject_requests FOR UPDATE TO authenticated USING (user_id = auth.uid() AND status = 'pending') WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_dsr_user ON public.data_subject_requests(user_id, requested_at DESC);

CREATE TRIGGER dsr_set_updated_at
BEFORE UPDATE ON public.data_subject_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
