-- Create email_aliases table for custom alias management
CREATE TABLE public.email_aliases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alias TEXT NOT NULL,
  local_part TEXT NOT NULL,
  domain TEXT NOT NULL,
  name TEXT,
  description TEXT,
  sender_name TEXT,
  sender_category TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  first_email_at TIMESTAMP WITH TIME ZONE,
  email_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(alias)
);

-- Enable RLS
ALTER TABLE public.email_aliases ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own aliases"
ON public.email_aliases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own aliases"
ON public.email_aliases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own aliases"
ON public.email_aliases FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own aliases"
ON public.email_aliases FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_aliases_updated_at
BEFORE UPDATE ON public.email_aliases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add new columns to captured_newsletters for opt-in tracking
ALTER TABLE public.captured_newsletters 
ADD COLUMN IF NOT EXISTS alias_id UUID REFERENCES public.email_aliases(id),
ADD COLUMN IF NOT EXISTS optin_status TEXT DEFAULT 'unknown',
ADD COLUMN IF NOT EXISTS confirmation_link TEXT,
ADD COLUMN IF NOT EXISTS email_type TEXT,
ADD COLUMN IF NOT EXISTS ctas JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS links_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS word_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_images BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS sentiment TEXT,
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- Create domains table for managing custom domains
CREATE TABLE public.email_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  domain TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'mailgun',
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  webhook_secret TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(domain)
);

-- Enable RLS for domains
ALTER TABLE public.email_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own domains"
ON public.email_domains FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own domains"
ON public.email_domains FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own domains"
ON public.email_domains FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own domains"
ON public.email_domains FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_email_domains_updated_at
BEFORE UPDATE ON public.email_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create chat_messages table for AI insights chat
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
ON public.chat_messages FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own messages"
ON public.chat_messages FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages FOR DELETE
USING (auth.uid() = user_id);