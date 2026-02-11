-- Migration: Tournament Co-organizer Access and Plan Enforcement
-- Date: 2026-02-23

-- =============================================
-- 1. FIX CO-ORGANIZER ACCESS (RLS)
-- =============================================

-- Drop restrictive owner-only policies
DROP POLICY IF EXISTS "Tournament owners can update their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Tournament owners can delete their tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Private tournaments viewable by owner and invited users" ON public.tournaments;

-- New SELECT policy: accessible if public, or owner, or co-organizer, or invited
CREATE POLICY "Tournaments are viewable by authorized users" ON public.tournaments
FOR SELECT USING (
  registration_type = 'public' OR
  owner_email = auth.jwt() ->> 'email' OR
  (organizers ? (auth.jwt() ->> 'email')) OR -- Check if email exists in organizers JSONB array
  (invited_users ? (auth.jwt() ->> 'email')) -- Check if email exists in invited_users JSONB array
);

-- New UPDATE policy: owner or co-organizer
CREATE POLICY "Tournament owners and organizers can update" ON public.tournaments
FOR UPDATE USING (
  owner_email = auth.jwt() ->> 'email' OR
  (organizers ? (auth.jwt() ->> 'email'))
);

-- New DELETE policy: Only owner can delete
CREATE POLICY "Only tournament owners can delete" ON public.tournaments
FOR DELETE USING (
  owner_email = auth.jwt() ->> 'email'
);

-- =============================================
-- 2. ENFORCE PLAN FEATURES (Triggers)
-- =============================================

-- Function to check if user has a valid subscription
CREATE OR REPLACE FUNCTION public.check_user_plan_level(p_email TEXT)
RETURNS TEXT AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT plan INTO v_plan
  FROM public.subscriptions
  WHERE user_email = p_email
    AND status IN ('active', 'trialing')
  LIMIT 1;
  
  RETURN COALESCE(v_plan, 'community');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to prevent non-PRO users from setting PRO features
CREATE OR REPLACE FUNCTION public.validate_tournament_pro_features()
RETURNS TRIGGER AS $$
DECLARE
  v_user_plan TEXT;
  v_user_email TEXT;
BEGIN
  v_user_email := auth.jwt() ->> 'email';
  v_user_plan := public.check_user_plan_level(v_user_email);

  -- If user is only Community, prevent setting certain fields
  IF v_user_plan = 'community' THEN
    -- Prevent setting branding colors
    IF (NEW.bracket_primary_color IS NOT NULL OR NEW.bracket_secondary_color IS NOT NULL) THEN
      RAISE EXCEPTION 'Personalización de marca requiere el plan Organizer Plus';
    END IF;

    -- Prevent setting entry fees (paid tournaments)
    IF (NEW.entry_fee > 0) THEN
      RAISE EXCEPTION 'Torneos con cuota de inscripción requieren el plan Organizer Plus';
    END IF;

    -- Prevent setting stations (Station Manager)
    -- NEW.stations is the column name found in database-schema.sql
    IF (NEW.stations IS NOT NULL AND jsonb_array_length(NEW.stations) > 0) THEN
      RAISE EXCEPTION 'Station Manager requiere el plan Organizer Plus';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to tournaments table
DROP TRIGGER IF EXISTS tr_validate_tournament_pro_features ON public.tournaments;
CREATE TRIGGER tr_validate_tournament_pro_features
  BEFORE INSERT OR UPDATE ON public.tournaments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_tournament_pro_features();
