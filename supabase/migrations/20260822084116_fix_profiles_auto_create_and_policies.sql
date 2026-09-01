/*
# Fix profiles auto-creation and policies

## Problem
The `profiles` table has `company_id` as NOT NULL with no default, the
`handle_new_user` trigger that should auto-create a profile on signup is
missing, and there is no INSERT policy — so new users cannot get a profile
row and login fails for any account without an existing profile.

## Changes

### 1. Default company_id
- Set `profiles.company_id` DEFAULT to the existing "Mina Şubesi" company
  (`0a88d849-f0a2-47bd-b80a-5fe95d4e9f26`) so auto-created profiles and
  client inserts that omit company_id still satisfy the NOT NULL constraint.

### 2. Re-create handle_new_user trigger
- Recreate the `public.handle_new_user()` SECURITY DEFINER function that
  inserts a profile row (with default company_id) for every new auth user.
- Re-attach the `on_auth_user_created` AFTER INSERT trigger on auth.users.

### 3. Add INSERT + UPDATE policies
- `insert_own_profile`: authenticated users can insert their own row.
- `update_own_profile`: authenticated users can update their own row.

### 4. Backfill missing profiles
- Insert a profile row for any auth.users.id that does not yet have one,
  using the default company_id.
*/

-- 1. Default company_id to the existing Mina Şubesi company
ALTER TABLE public.profiles
  ALTER COLUMN company_id SET DEFAULT '0a88d849-f0a2-47bd-b80a-5fe95d4e9f26';

-- 2. Re-create the auto-profile function + trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. INSERT + UPDATE policies (drop first for idempotency)
DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 4. Backfill: create a profile row for any existing auth user missing one
INSERT INTO public.profiles (id)
SELECT au.id FROM auth.users au
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = au.id)
ON CONFLICT (id) DO NOTHING;