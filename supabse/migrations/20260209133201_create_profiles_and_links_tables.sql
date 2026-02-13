CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username citext UNIQUE NOT NULL,
  display_name text DEFAULT '',
  bio text DEFAULT '',
  avatar_url text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  url text NOT NULL CHECK (url ~* '^https?://'),
  platform text DEFAULT 'custom',
  position integer NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_ip text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.link_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id uuid NOT NULL REFERENCES public.links(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  visitor_ip text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_links_user_id ON public.links(user_id);
CREATE INDEX IF NOT EXISTS idx_links_position ON public.links(user_id, position);
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON public.profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_profile_id ON public.link_clicks(profile_id);
CREATE INDEX IF NOT EXISTS idx_link_clicks_link_id ON public.link_clicks(link_id);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.link_clicks ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Anyone can insert profile views" ON public.profile_views;
DROP POLICY IF EXISTS "Users can view their own profile views" ON public.profile_views;

CREATE POLICY "Anyone can insert profile views"
ON public.profile_views
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own profile views"
ON public.profile_views
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "Anyone can insert link clicks" ON public.link_clicks;
DROP POLICY IF EXISTS "Users can view their own link clicks" ON public.link_clicks;

CREATE POLICY "Anyone can insert link clicks"
ON public.link_clicks
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Users can view their own link clicks"
ON public.link_clicks
FOR SELECT
TO authenticated
USING (auth.uid() = profile_id);

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  uname text;
BEGIN
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
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

ALTER TABLE public.links
ADD COLUMN IF NOT EXISTS platform text DEFAULT 'custom';

UPDATE public.links
SET platform =
  CASE
    WHEN url ILIKE '%github.com%' THEN 'github'
    WHEN url ILIKE '%linkedin.com%' THEN 'linkedin'
    WHEN url ILIKE '%instagram.com%' THEN 'instagram'
    WHEN url ILIKE '%youtube.com%' OR url ILIKE '%youtu.be%' THEN 'youtube'
    WHEN url ILIKE '%twitter.com%' OR url ILIKE '%x.com%' THEN 'twitter'
    WHEN url ILIKE '%facebook.com%' THEN 'facebook'
    WHEN url ILIKE '%tiktok.com%' THEN 'tiktok'
    WHEN url ILIKE '%pinterest.com%' THEN 'pinterest'
    WHEN url ILIKE '%reddit.com%' THEN 'reddit'
    WHEN url ILIKE '%snapchat.com%' THEN 'snapchat'
    WHEN url ILIKE '%discord.gg%' OR url ILIKE '%discord.com%' THEN 'discord'
    WHEN url ILIKE '%t.me%' OR url ILIKE '%telegram%' THEN 'telegram'
    WHEN url ILIKE '%wa.me%' OR url ILIKE '%whatsapp.com%' THEN 'whatsapp'
    WHEN url ILIKE '%medium.com%' THEN 'medium'
    WHEN url ILIKE '%stackoverflow.com%' THEN 'stackoverflow'
    WHEN url ILIKE '%drive.google.com%' THEN 'googledrive'
    ELSE 'custom'
  END;
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'indigo';

ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS button_style text DEFAULT 'gradient';
