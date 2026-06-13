DROP POLICY IF EXISTS "anon read nps by token" ON public.nps_surveys;
DROP POLICY IF EXISTS "anon submit nps" ON public.nps_surveys;
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.nps_surveys FROM anon;