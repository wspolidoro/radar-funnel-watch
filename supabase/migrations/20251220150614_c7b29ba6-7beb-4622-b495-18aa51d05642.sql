-- Add is_platform_domain column to email_domains
ALTER TABLE public.email_domains ADD COLUMN IF NOT EXISTS is_platform_domain boolean DEFAULT false;

-- Insert platform default domains (available to all users)
INSERT INTO public.email_domains (domain, provider, is_verified, is_active, is_platform_domain, user_id, webhook_secret)
VALUES 
  ('tracker.newsletterspy.io', 'platform', true, true, true, '00000000-0000-0000-0000-000000000000', 'platform-secret'),
  ('inbox.newsletterspy.io', 'platform', true, true, true, '00000000-0000-0000-0000-000000000000', 'platform-secret')
ON CONFLICT DO NOTHING;

-- Update RLS to allow reading platform domains
DROP POLICY IF EXISTS "Users can view their own domains" ON public.email_domains;

CREATE POLICY "Users can view their own domains or platform domains" 
ON public.email_domains 
FOR SELECT 
USING (auth.uid() = user_id OR is_platform_domain = true);