
CREATE TABLE public.service_catalog (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  default_price_cents integer NOT NULL DEFAULT 0,
  default_duration_minutes integer NOT NULL DEFAULT 60,
  category text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_catalog TO authenticated;
GRANT ALL ON public.service_catalog TO service_role;

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own service catalog"
ON public.service_catalog FOR ALL
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_service_catalog_updated_at
BEFORE UPDATE ON public.service_catalog
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_service_catalog_owner_active ON public.service_catalog (owner_id, active);
