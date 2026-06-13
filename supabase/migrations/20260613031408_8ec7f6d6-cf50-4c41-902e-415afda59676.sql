
-- 1. Fix get_org_owner ambiguity
CREATE OR REPLACE FUNCTION public.get_org_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT org_owner_id FROM public.user_roles
       WHERE user_id = _uid
       ORDER BY created_at ASC NULLS LAST, org_owner_id ASC
       LIMIT 1),
    _uid
  );
$$;

-- 2. clients: split admin (all) and operator (job-scoped) SELECT
DROP POLICY IF EXISTS "org reads clients" ON public.clients;
CREATE POLICY "admin reads clients" ON public.clients FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE POLICY "operator reads assigned clients" ON public.clients FOR SELECT TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND NOT public.is_org_admin(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.client_id = clients.id
        AND public.operator_can_access_job(auth.uid(), j.team_id)
    )
  );

-- 3. recurring_schedules: operator only sees own team schedules
DROP POLICY IF EXISTS "org reads recurring" ON public.recurring_schedules;
CREATE POLICY "admin reads recurring" ON public.recurring_schedules FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE POLICY "operator reads assigned recurring" ON public.recurring_schedules FOR SELECT TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND NOT public.is_org_admin(auth.uid())
    AND public.operator_can_access_job(auth.uid(), team_id)
  );

-- 4. referrals: admin-only read
DROP POLICY IF EXISTS "org reads referrals" ON public.referrals;
CREATE POLICY "admin reads referrals" ON public.referrals FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

-- 5. sms_messages: admin-only read
DROP POLICY IF EXISTS "org reads sms" ON public.sms_messages;
CREATE POLICY "admin reads sms" ON public.sms_messages FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

-- 6. job_photos: tighten UPDATE to require operator access
DROP POLICY IF EXISTS "org updates job photos" ON public.job_photos;
CREATE POLICY "org updates job photos" ON public.job_photos FOR UPDATE TO authenticated
  USING (
    owner_id = public.get_org_owner(auth.uid())
    AND (
      public.is_org_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id
                 AND public.operator_can_access_job(auth.uid(), j.team_id))
    )
  )
  WITH CHECK (
    owner_id = public.get_org_owner(auth.uid())
    AND (
      public.is_org_admin(auth.uid())
      OR EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_photos.job_id
                 AND public.operator_can_access_job(auth.uid(), j.team_id))
    )
  );

-- 7. Storage: payment-proofs INSERT/UPDATE/DELETE scoped to owner folder = auth.uid()
DROP POLICY IF EXISTS "owners upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "owners update payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "owners delete payment proofs" ON storage.objects;
CREATE POLICY "owners upload payment proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owners update payment proofs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "owners delete payment proofs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'payment-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);

-- 8. Realtime: restrict team_loc channel to team members / org admins
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "team_loc topic auth" ON realtime.messages;
CREATE POLICY "team_loc topic auth" ON realtime.messages FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'team_loc:%' THEN
        EXISTS (
          SELECT 1 FROM public.team_members tm
          WHERE tm.user_id = auth.uid()
            AND tm.team_id::text = substring(realtime.topic() from 10)
        )
        OR EXISTS (
          SELECT 1 FROM public.teams t
          WHERE t.id::text = substring(realtime.topic() from 10)
            AND t.owner_id = public.get_org_owner(auth.uid())
            AND public.is_org_admin(auth.uid())
        )
      ELSE false
    END
  );
