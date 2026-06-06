CREATE TABLE public.team_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id uuid NOT NULL,
  team_id uuid NOT NULL,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  accuracy_m double precision,
  heading double precision,
  speed double precision,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX team_locations_team_unique ON public.team_locations (team_id);
CREATE INDEX team_locations_owner_idx ON public.team_locations (owner_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_locations TO authenticated;
GRANT ALL ON public.team_locations TO service_role;

ALTER TABLE public.team_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage own team locations"
  ON public.team_locations
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_team_locations_updated_at
  BEFORE UPDATE ON public.team_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.team_locations REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_locations;