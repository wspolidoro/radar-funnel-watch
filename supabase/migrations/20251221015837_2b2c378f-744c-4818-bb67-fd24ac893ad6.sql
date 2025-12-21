-- Add DNS verification columns to email_domains
ALTER TABLE email_domains ADD COLUMN IF NOT EXISTS mx_records jsonb;
ALTER TABLE email_domains ADD COLUMN IF NOT EXISTS dns_verified_at timestamptz;
ALTER TABLE email_domains ADD COLUMN IF NOT EXISTS dns_status text DEFAULT 'pending';

-- Create connectivity_tests table
CREATE TABLE IF NOT EXISTS connectivity_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid REFERENCES email_domains(id) ON DELETE CASCADE,
  test_alias text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  received_at timestamptz,
  status text DEFAULT 'pending',
  latency_ms integer,
  error_message text,
  user_id uuid NOT NULL
);

-- Enable RLS on connectivity_tests
ALTER TABLE connectivity_tests ENABLE ROW LEVEL SECURITY;

-- RLS policies for connectivity_tests
CREATE POLICY "Adminsaas can manage connectivity tests" 
ON connectivity_tests 
FOR ALL 
USING (has_role(auth.uid(), 'adminsaas'::app_role));

CREATE POLICY "System can insert connectivity tests" 
ON connectivity_tests 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update connectivity tests" 
ON connectivity_tests 
FOR UPDATE 
USING (true);

-- Create email_logs table
CREATE TABLE IF NOT EXISTS email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain text,
  alias text,
  from_email text,
  from_name text,
  subject text,
  status text DEFAULT 'received',
  error_message text,
  processing_time_ms integer,
  received_at timestamptz DEFAULT now(),
  metadata jsonb,
  newsletter_id uuid REFERENCES captured_newsletters(id) ON DELETE SET NULL
);

-- Enable RLS on email_logs
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_logs
CREATE POLICY "Adminsaas can view all email logs" 
ON email_logs 
FOR SELECT 
USING (has_role(auth.uid(), 'adminsaas'::app_role));

CREATE POLICY "System can insert email logs" 
ON email_logs 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update email logs" 
ON email_logs 
FOR UPDATE 
USING (true);

-- Enable realtime for email_logs
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_logs;