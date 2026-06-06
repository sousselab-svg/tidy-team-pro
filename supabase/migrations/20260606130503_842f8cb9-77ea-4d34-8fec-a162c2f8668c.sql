
-- 1) Role enum
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'operator');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) user_roles
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  org_owner_id uuid NOT NULL,
  role public.app_role NOT NULL DEFAULT 'operator',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS user_roles_org_idx ON public.user_roles(org_owner_id);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users read own or org roles" ON public.user_roles;
CREATE POLICY "users read own or org roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR org_owner_id = auth.uid());

DROP POLICY IF EXISTS "admin manages org roles" ON public.user_roles;
CREATE POLICY "admin manages org roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (org_owner_id = auth.uid())
  WITH CHECK (org_owner_id = auth.uid());

CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Link team_members to an auth user (nullable; one user per member)
ALTER TABLE public.team_members
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS team_members_user_id_uidx
  ON public.team_members(user_id) WHERE user_id IS NOT NULL;

-- 4) Helpers (SECURITY DEFINER avoids recursive RLS lookups)
CREATE OR REPLACE FUNCTION public.get_org_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT org_owner_id FROM public.user_roles WHERE user_id = _uid),
    _uid
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _uid AND role = 'operator'
  );
$$;

CREATE OR REPLACE FUNCTION public.operator_can_access_job(_uid uuid, _team_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _team_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _uid AND team_id = _team_id
  );
$$;

-- 5) Replace owner-only RLS with org-aware policies on jobs
DROP POLICY IF EXISTS "owners manage own jobs" ON public.jobs;

CREATE POLICY "org sees jobs" ON public.jobs
  FOR SELECT TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND (public.is_org_admin(auth.uid()) OR public.operator_can_access_job(auth.uid(), team_id))
  );

CREATE POLICY "admin inserts jobs" ON public.jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.get_org_owner(auth.uid())
    AND public.is_org_admin(auth.uid())
  );

CREATE POLICY "org updates jobs" ON public.jobs
  FOR UPDATE TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND (public.is_org_admin(auth.uid()) OR public.operator_can_access_job(auth.uid(), team_id))
  )
  WITH CHECK (
    owner_id = public.get_org_owner(auth.uid())
    AND (public.is_org_admin(auth.uid()) OR public.operator_can_access_job(auth.uid(), team_id))
  );

CREATE POLICY "admin deletes jobs" ON public.jobs
  FOR DELETE TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid())
  );

-- 6) job_photos: anyone who can see the parent job
DROP POLICY IF EXISTS "owners manage own job photos" ON public.job_photos;

CREATE POLICY "org reads job photos" ON public.job_photos
  FOR SELECT TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos.job_id
        AND (public.is_org_admin(auth.uid()) OR public.operator_can_access_job(auth.uid(), j.team_id))
    )
  );

CREATE POLICY "org writes job photos" ON public.job_photos
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.get_org_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_photos.job_id
        AND (public.is_org_admin(auth.uid()) OR public.operator_can_access_job(auth.uid(), j.team_id))
    )
  );

CREATE POLICY "org updates job photos" ON public.job_photos
  FOR UPDATE TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()));

CREATE POLICY "org deletes job photos" ON public.job_photos
  FOR DELETE TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND (
      public.is_org_admin(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.id = job_photos.job_id
          AND public.operator_can_access_job(auth.uid(), j.team_id)
      )
    )
  );

-- 7) Clients / teams / team_members: operators read same org; admin manages
DROP POLICY IF EXISTS "owners manage own clients" ON public.clients;
CREATE POLICY "org reads clients" ON public.clients
  FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin writes clients" ON public.clients
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE POLICY "admin updates clients" ON public.clients
  FOR UPDATE TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE POLICY "admin deletes clients" ON public.clients
  FOR DELETE TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own teams" ON public.teams;
CREATE POLICY "org reads teams" ON public.teams
  FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin manages teams" ON public.teams
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own team members" ON public.team_members;
CREATE POLICY "org reads team members" ON public.team_members
  FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin manages team members" ON public.team_members
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

-- 8) Admin-only domains
DROP POLICY IF EXISTS "owners manage own invoices" ON public.invoices;
CREATE POLICY "admin manages invoices" ON public.invoices
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own quotes" ON public.quotes;
CREATE POLICY "admin manages quotes" ON public.quotes
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own service catalog" ON public.service_catalog;
CREATE POLICY "admin manages service catalog" ON public.service_catalog
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own settings" ON public.company_settings;
CREATE POLICY "admin manages settings" ON public.company_settings
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own team locations" ON public.team_locations;
CREATE POLICY "org reads team locations" ON public.team_locations
  FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin writes team locations" ON public.team_locations
  FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE POLICY "operator writes own team location" ON public.team_locations
  FOR INSERT TO authenticated
  WITH CHECK (
    owner_id = public.get_org_owner(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.team_members
      WHERE user_id = auth.uid() AND team_id = team_locations.team_id
    )
  );
CREATE POLICY "admin manages team locations" ON public.team_locations
  FOR UPDATE TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE POLICY "admin deletes team locations" ON public.team_locations
  FOR DELETE TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

DROP POLICY IF EXISTS "owners manage own nps" ON public.nps_surveys;
CREATE POLICY "admin manages nps" ON public.nps_surveys
  FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
