-- Create role enum
CREATE TYPE public.app_role AS ENUM ('adminsaas', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to get user's highest role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY 
    CASE role 
      WHEN 'adminsaas' THEN 1 
      WHEN 'admin' THEN 2 
      WHEN 'user' THEN 3 
    END
  LIMIT 1
$$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Only adminsaas can manage roles"
ON public.user_roles
FOR ALL
USING (public.has_role(auth.uid(), 'adminsaas'));

-- Add more platform domains
INSERT INTO public.email_domains (domain, provider, is_verified, is_active, is_platform_domain, user_id, webhook_secret)
VALUES 
  ('monitor.newsletterspy.io', 'platform', true, true, true, '00000000-0000-0000-0000-000000000000', 'platform-secret'),
  ('capture.newsletterspy.io', 'platform', true, true, true, '00000000-0000-0000-0000-000000000000', 'platform-secret'),
  ('watch.newsletterspy.io', 'platform', true, true, true, '00000000-0000-0000-0000-000000000000', 'platform-secret')
ON CONFLICT DO NOTHING;