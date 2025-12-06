-- Create table for email seed configurations
CREATE TABLE public.email_seeds (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('gmail', 'outlook', 'yahoo', 'imap_custom')),
  imap_host TEXT,
  imap_port INTEGER DEFAULT 993,
  use_ssl BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for captured newsletters
CREATE TABLE public.captured_newsletters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seed_id UUID REFERENCES public.email_seeds(id) ON DELETE CASCADE NOT NULL,
  competitor_id UUID,
  from_email TEXT NOT NULL,
  from_name TEXT,
  subject TEXT NOT NULL,
  html_content TEXT,
  text_content TEXT,
  received_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_processed BOOLEAN DEFAULT false,
  category TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_seeds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.captured_newsletters ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_seeds
CREATE POLICY "Users can view their own seeds" 
ON public.email_seeds 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own seeds" 
ON public.email_seeds 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own seeds" 
ON public.email_seeds 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own seeds" 
ON public.email_seeds 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for captured_newsletters (via seed ownership)
CREATE POLICY "Users can view newsletters from their seeds" 
ON public.captured_newsletters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.email_seeds 
    WHERE email_seeds.id = captured_newsletters.seed_id 
    AND email_seeds.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert newsletters for their seeds" 
ON public.captured_newsletters 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.email_seeds 
    WHERE email_seeds.id = seed_id 
    AND email_seeds.user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_email_seeds_updated_at
BEFORE UPDATE ON public.email_seeds
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();