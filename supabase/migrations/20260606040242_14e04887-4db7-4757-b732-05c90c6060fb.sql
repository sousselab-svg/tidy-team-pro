
CREATE TABLE public.job_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  job_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('before','after')),
  path text NOT NULL,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_photos TO authenticated;
GRANT ALL ON public.job_photos TO service_role;

ALTER TABLE public.job_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own job photos"
ON public.job_photos FOR ALL TO authenticated
USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE INDEX idx_job_photos_job ON public.job_photos(job_id);

CREATE TRIGGER update_job_photos_updated_at
BEFORE UPDATE ON public.job_photos
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage RLS: owners manage objects under their uid/ prefix in job-photos bucket
CREATE POLICY "owners read job-photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "owners insert job-photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "owners update job-photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "owners delete job-photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'job-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
