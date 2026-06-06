
-- 1) recurring_schedules
CREATE TABLE public.recurring_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_id uuid NOT NULL,
  title text NOT NULL,
  address text,
  price_cents integer NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 90,
  team_id uuid,
  notes text,
  frequency text NOT NULL CHECK (frequency IN ('weekly','biweekly','monthly')),
  day_of_week smallint CHECK (day_of_week BETWEEN 0 AND 6),
  day_of_month smallint CHECK (day_of_month BETWEEN 1 AND 28),
  time_of_day time NOT NULL DEFAULT '09:00',
  next_run_on date NOT NULL,
  active boolean NOT NULL DEFAULT true,
  last_generated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recurring_schedules TO authenticated;
GRANT ALL ON public.recurring_schedules TO service_role;
ALTER TABLE public.recurring_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads recurring" ON public.recurring_schedules FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin manages recurring" ON public.recurring_schedules FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE TRIGGER trg_recurring_updated BEFORE UPDATE ON public.recurring_schedules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) referrals
CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  referrer_client_id uuid NOT NULL,
  referred_client_id uuid,
  referred_name text,
  referred_email text,
  code text NOT NULL,
  credit_cents integer NOT NULL DEFAULT 2500,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','earned','redeemed','cancelled')),
  earned_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads referrals" ON public.referrals FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin manages referrals" ON public.referrals FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE TRIGGER trg_referrals_updated BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) client_credits (balance per client)
CREATE TABLE public.client_credits (
  client_id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  balance_cents integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_credits TO authenticated;
GRANT ALL ON public.client_credits TO service_role;
ALTER TABLE public.client_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads credits" ON public.client_credits FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin manages credits" ON public.client_credits FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE TRIGGER trg_credits_updated BEFORE UPDATE ON public.client_credits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) reactivation_coupons
CREATE TABLE public.reactivation_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_id uuid NOT NULL,
  code text NOT NULL,
  discount_cents integer NOT NULL DEFAULT 1500,
  status text NOT NULL DEFAULT 'sent' CHECK (status IN ('sent','redeemed','expired','cancelled')),
  expires_on date NOT NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reactivation_coupons TO authenticated;
GRANT ALL ON public.reactivation_coupons TO service_role;
ALTER TABLE public.reactivation_coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org reads coupons" ON public.reactivation_coupons FOR SELECT TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()));
CREATE POLICY "admin manages coupons" ON public.reactivation_coupons FOR ALL TO authenticated
  USING (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()))
  WITH CHECK (owner_id = public.get_org_owner(auth.uid()) AND public.is_org_admin(auth.uid()));
CREATE TRIGGER trg_coupons_updated BEFORE UPDATE ON public.reactivation_coupons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) clients.referral_code
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS referral_code text;
CREATE UNIQUE INDEX IF NOT EXISTS clients_owner_referral_code_uidx
  ON public.clients(owner_id, referral_code) WHERE referral_code IS NOT NULL;

-- backfill referral_code for existing clients
UPDATE public.clients SET referral_code = upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
WHERE referral_code IS NULL;

-- function + trigger to auto-generate on insert
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_clients_referral_code ON public.clients;
CREATE TRIGGER trg_clients_referral_code BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.generate_referral_code();

-- 6) company_settings: reactivation config
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS reactivation_days integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS reactivation_discount_cents integer NOT NULL DEFAULT 1500,
  ADD COLUMN IF NOT EXISTS referral_credit_cents integer NOT NULL DEFAULT 2500;
