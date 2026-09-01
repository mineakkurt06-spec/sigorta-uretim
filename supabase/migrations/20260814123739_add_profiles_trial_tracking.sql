/*
# Add profiles table for trial & subscription tracking

1. New Table
- `profiles` — one row per auth user, tracks free trial and license/subscription state.

2. Columns
- `id` (uuid, PK, references auth.users.id)
- `trial_ends_at` (timestamptz, default NOW() + 14 days)
- `is_subscribed` (boolean, default false)
- `subscription_status` (text: 'trial' | 'active' | 'expired', default 'trial')
- `created_at` (timestamptz, default NOW())

3. RLS
- Enabled. Users can only read/update their own profile row.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  trial_ends_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  is_subscribed boolean NOT NULL DEFAULT false,
  subscription_status text NOT NULL DEFAULT 'trial',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Auto-create a profile row when a new auth user is created
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
