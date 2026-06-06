
CREATE TABLE public.nps_surveys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  job_id uuid NOT NULL,
  client_id uuid,
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  score integer,
  comment text,
  sent_at timestamptz,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nps_score_range CHECK (score IS NULL OR (score >= 0 AND score <= 10))
);

CREATE INDEX nps_surveys_owner_idx ON public.nps_surveys(owner_id);
CREATE INDEX nps_surveys_job_idx ON public.nps_surveys(job_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nps_surveys TO authenticated;
GRANT SELECT, UPDATE ON public.nps_surveys TO anon;
GRANT ALL ON public.nps_surveys TO service_role;

ALTER TABLE public.nps_surveys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own nps" ON public.nps_surveys
  FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Anonymous can read a survey by token (token acts as the secret)
CREATE POLICY "anon read nps by token" ON public.nps_surveys
  FOR SELECT TO anon
  USING (true);

-- Anonymous can submit a response only if not yet submitted
CREATE POLICY "anon submit nps" ON public.nps_surveys
  FOR UPDATE TO anon
  USING (submitted_at IS NULL)
  WITH CHECK (submitted_at IS NOT NULL AND score IS NOT NULL);

CREATE TRIGGER update_nps_surveys_updated_at
  BEFORE UPDATE ON public.nps_surveys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
