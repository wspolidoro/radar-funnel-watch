-- Add encrypted password field to email_seeds table
ALTER TABLE public.email_seeds 
ADD COLUMN IF NOT EXISTS encrypted_password text;