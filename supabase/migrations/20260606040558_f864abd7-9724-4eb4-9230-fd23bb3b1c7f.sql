
ALTER TABLE public.jobs
  ADD COLUMN signature_path text,
  ADD COLUMN signed_by_name text,
  ADD COLUMN signed_at timestamptz;
