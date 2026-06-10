ALTER TABLE public.jobs
  ADD CONSTRAINT jobs_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='recurring_schedules' AND column_name='team_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='recurring_schedules_team_id_fkey'
  ) THEN
    EXECUTE 'ALTER TABLE public.recurring_schedules
             ADD CONSTRAINT recurring_schedules_team_id_fkey
             FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE SET NULL';
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';