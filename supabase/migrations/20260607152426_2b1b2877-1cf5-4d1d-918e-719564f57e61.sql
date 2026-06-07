
-- 1. Deletion confirmations (double opt-in)
CREATE TABLE IF NOT EXISTS public.deletion_confirmations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.deletion_confirmations TO authenticated;
GRANT ALL ON public.deletion_confirmations TO service_role;

ALTER TABLE public.deletion_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own deletion confirmations"
  ON public.deletion_confirmations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_deletion_confirmations_updated
  BEFORE UPDATE ON public.deletion_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_deletion_confirmations_user
  ON public.deletion_confirmations(user_id);

-- 2. Rate limit events
CREATE TABLE IF NOT EXISTS public.rate_limit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rate_limit_events TO authenticated;
GRANT ALL ON public.rate_limit_events TO service_role;

ALTER TABLE public.rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own rate events"
  ON public.rate_limit_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_rate_limit_events_user_action_time
  ON public.rate_limit_events(user_id, action, created_at DESC);

-- 3. Seed initial legal documents if absent
INSERT INTO public.legal_documents (doc_type, version, effective_at, summary, is_current)
SELECT 'terms', '1.0.0', now(), 'Versão inicial dos Termos de Uso.', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_documents WHERE doc_type = 'terms' AND is_current = true
);

INSERT INTO public.legal_documents (doc_type, version, effective_at, summary, is_current)
SELECT 'privacy', '1.0.0', now(), 'Versão inicial da Política de Privacidade.', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_documents WHERE doc_type = 'privacy' AND is_current = true
);
