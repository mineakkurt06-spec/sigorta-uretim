/*
# Remove trial/license infrastructure

1. Drop trigger and function that auto-create profile rows
2. Drop profiles table (trial tracking)
3. Drop licenses table (license key verification)
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.licenses CASCADE;
