
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  user_id uuid NOT NULL,
  kind text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  read_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX notifications_user_created_idx ON public.notifications (user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user reads own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid())));

CREATE POLICY "user updates own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin writes notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

CREATE POLICY "admin deletes notifications"
  ON public.notifications FOR DELETE TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

CREATE TRIGGER set_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
