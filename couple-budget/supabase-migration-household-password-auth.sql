-- Migrate households table from invite-code based to password-based authentication

-- Make invite_code nullable (old system no longer needed)
ALTER TABLE public.households
  ALTER COLUMN invite_code DROP NOT NULL;

-- Add name and password columns if they don't exist
ALTER TABLE public.households
  ADD COLUMN IF NOT EXISTS name TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- Create household by name and password
CREATE OR REPLACE FUNCTION public.create_household(
  p_name TEXT,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  hid UUID;
  uid UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  uid := auth.uid();

  -- Validate inputs
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 OR LENGTH(TRIM(p_name)) > 20 THEN
    RAISE EXCEPTION '가계 이름은 2-20자여야 합니다';
  END IF;

  IF p_password IS NULL OR LENGTH(p_password) = 0 THEN
    RAISE EXCEPTION '비밀번호를 입력해 주세요';
  END IF;

  -- Check if user already has a household
  IF EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = uid
  ) THEN
    RAISE EXCEPTION '이미 가계에 속해있습니다.';
  END IF;

  -- Create household
  INSERT INTO public.households (id, name, password, created_by, invite_code)
  VALUES (gen_random_uuid(), TRIM(p_name), p_password, uid, NULL)
  RETURNING id INTO hid;

  -- Add current user as first member
  INSERT INTO public.household_members (household_id, user_id)
  VALUES (hid, uid);

  RETURN hid;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT) TO authenticated;

-- Join household by password
CREATE OR REPLACE FUNCTION public.join_household_by_password(
  p_name TEXT,
  p_password TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  hid UUID;
  uid UUID;
  cnt INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION '로그인이 필요합니다.';
  END IF;

  uid := auth.uid();

  -- Validate inputs
  IF p_name IS NULL OR LENGTH(TRIM(p_name)) < 2 OR LENGTH(TRIM(p_name)) > 20 THEN
    RAISE EXCEPTION '가계 이름은 2-20자여야 합니다';
  END IF;

  IF p_password IS NULL OR LENGTH(p_password) = 0 THEN
    RAISE EXCEPTION '비밀번호를 입력해 주세요';
  END IF;

  -- Look up household by name
  SELECT id INTO hid FROM public.households
  WHERE name = TRIM(p_name) AND password = p_password;

  IF hid IS NULL THEN
    RAISE EXCEPTION '가계를 찾을 수 없습니다. 가계 이름 또는 비밀번호를 확인해주세요.';
  END IF;

  -- Check if user already has a different household
  IF EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = uid AND household_id <> hid
  ) THEN
    RAISE EXCEPTION '이미 다른 가계에 속해있습니다. 먼저 현재 가계 연결을 해제하세요.';
  END IF;

  -- Check if already a member (idempotent)
  IF EXISTS (
    SELECT 1 FROM public.household_members
    WHERE user_id = uid AND household_id = hid
  ) THEN
    RETURN hid;
  END IF;

  -- Check household has <= 2 members
  SELECT COUNT(*)::INT INTO cnt
  FROM public.household_members
  WHERE household_id = hid;

  IF cnt >= 2 THEN
    RAISE EXCEPTION '이 가계는 이미 2명이 참여 중입니다.';
  END IF;

  -- Add user to household
  INSERT INTO public.household_members (household_id, user_id)
  VALUES (hid, uid);

  RETURN hid;
END;
$fn$;

GRANT EXECUTE ON FUNCTION public.join_household_by_password(TEXT, TEXT) TO authenticated;
