
CREATE TABLE public.role_permissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_owner_id uuid NOT NULL,
  role public.app_role NOT NULL,
  permission text NOT NULL,
  allowed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_owner_id, role, permission)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.role_permissions TO authenticated;
GRANT ALL ON public.role_permissions TO service_role;

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org reads role permissions" ON public.role_permissions
  FOR SELECT TO authenticated
  USING (org_owner_id = public.get_org_owner(auth.uid()));

CREATE POLICY "admin manages role permissions" ON public.role_permissions
  FOR ALL TO authenticated
  USING (org_owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (org_owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));

CREATE TRIGGER role_permissions_updated_at
  BEFORE UPDATE ON public.role_permissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.has_permission(_uid uuid, _permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN public.is_org_admin(_uid) THEN true
    ELSE COALESCE(
      (SELECT allowed FROM public.role_permissions
        WHERE org_owner_id = public.get_org_owner(_uid)
          AND role = 'operator'
          AND permission = _permission
        LIMIT 1),
      false
    )
  END
$$;
