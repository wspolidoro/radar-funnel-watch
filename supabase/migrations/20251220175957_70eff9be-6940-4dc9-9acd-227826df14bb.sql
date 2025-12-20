-- Add AI-related columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS gpt_api_key TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ai_credits INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS use_own_gpt BOOLEAN DEFAULT false;

-- Create AI usage log table
CREATE TABLE public.ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  credits_used INTEGER NOT NULL DEFAULT 1,
  tokens_input INTEGER,
  tokens_output INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on ai_usage_log
ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own AI usage logs
CREATE POLICY "Users can view their own AI usage" 
ON public.ai_usage_log 
FOR SELECT 
USING (auth.uid() = user_id);

-- System can insert logs (via edge functions with service role)
CREATE POLICY "System can insert AI usage logs" 
ON public.ai_usage_log 
FOR INSERT 
WITH CHECK (true);

-- Adminsaas can view all AI usage logs
CREATE POLICY "Adminsaas can view all AI usage logs" 
ON public.ai_usage_log 
FOR SELECT 
USING (has_role(auth.uid(), 'adminsaas'));

-- Create index for faster queries
CREATE INDEX idx_ai_usage_log_user_id ON public.ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_log_created_at ON public.ai_usage_log(created_at DESC);