-- Enable citext extension for case-insensitive usernames
CREATE EXTENSION IF NOT EXISTS citext;

--------------------------------------------------
-- PROFILES TABLE
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username citext UNIQUE NOT NULL,
  display_name text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- LINKS TABLE
--------------------------------------------------
CREATE TABLE IF NOT EXISTS public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL CHECK (url ~* '^https?://'),
  position integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

--------------------------------------------------
-- INDEXES
--------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_position ON public.links(user_id, position);

--------------------------------------------------
-- ENABLE RLS
--------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;

--------------------------------------------------
-- PROFILES POLICIES
--------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Anyone can view profiles"
  ON public.profiles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

--------------------------------------------------
-- LINKS POLICIES
--------------------------------------------------
DROP POLICY IF EXISTS "Anyone can view active links" ON public.links;
DROP POLICY IF EXISTS "Users can view their own links" ON public.links;
DROP POLICY IF EXISTS "Users can insert their own links" ON public.links;
DROP POLICY IF EXISTS "Users can update their own links" ON public.links;
DROP POLICY IF EXISTS "Users can delete their own links" ON public.links;

CREATE POLICY "Anyone can view active links"
  ON public.links
  FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Users can view their own links"
  ON public.links
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own links"
  ON public.links
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own links"
  ON public.links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own links"
  ON public.links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

--------------------------------------------------
-- UPDATED_AT FUNCTION
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

--------------------------------------------------
-- UPDATED_AT TRIGGERS
--------------------------------------------------
DROP TRIGGER IF EXISTS set_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS set_links_updated_at ON public.links;

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_links_updated_at
  BEFORE UPDATE ON public.links
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

--------------------------------------------------
-- AUTO CREATE PROFILE ON SIGNUP
--------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  uname text;
BEGIN
  -- If username exists in metadata use it, else fallback to email prefix
  uname := COALESCE(
    NEW.raw_user_meta_data->>'username',
    split_part(NEW.email, '@', 1)
  );

  INSERT INTO public.profiles (id, username, display_name)
  VALUES (NEW.id, uname, uname);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
