ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS lat double precision,
  ADD COLUMN IF NOT EXISTS lng double precision,
  ADD COLUMN IF NOT EXISTS geofence_radius_m integer NOT NULL DEFAULT 150,
  ADD COLUMN IF NOT EXISTS auto_check_in_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS arrived_at timestamptz;