-- Create reports table for document generation and scheduling
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  content_json JSONB DEFAULT '{}'::jsonb,
  file_url TEXT,
  format TEXT DEFAULT 'pdf',
  status TEXT DEFAULT 'pending',
  is_scheduled BOOLEAN DEFAULT false,
  schedule_frequency TEXT,
  send_email BOOLEAN DEFAULT false,
  email_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_funnels table for visual sequences
CREATE TABLE public.email_funnels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  sender_email TEXT NOT NULL,
  sender_name TEXT,
  email_ids UUID[] DEFAULT '{}',
  color TEXT DEFAULT '#3b82f6',
  icon TEXT DEFAULT 'mail',
  tags TEXT[] DEFAULT '{}',
  total_emails INTEGER DEFAULT 0,
  first_email_at TIMESTAMP WITH TIME ZONE,
  last_email_at TIMESTAMP WITH TIME ZONE,
  avg_interval_hours NUMERIC,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- RLS policies for reports
CREATE POLICY "Users can view their own reports"
  ON public.reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
  ON public.reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
  ON public.reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
  ON public.reports FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on email_funnels
ALTER TABLE public.email_funnels ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_funnels
CREATE POLICY "Users can view their own funnels"
  ON public.email_funnels FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own funnels"
  ON public.email_funnels FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own funnels"
  ON public.email_funnels FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own funnels"
  ON public.email_funnels FOR DELETE
  USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_reports_created_at ON public.reports(created_at DESC);
CREATE INDEX idx_email_funnels_user_id ON public.email_funnels(user_id);
CREATE INDEX idx_email_funnels_sender_email ON public.email_funnels(sender_email);

-- Add triggers for updated_at
CREATE TRIGGER update_reports_updated_at
  BEFORE UPDATE ON public.reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_funnels_updated_at
  BEFORE UPDATE ON public.email_funnels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();