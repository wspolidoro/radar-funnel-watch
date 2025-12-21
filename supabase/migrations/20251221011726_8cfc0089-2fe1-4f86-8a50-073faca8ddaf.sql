-- Add RLS policies for adminsaas to manage platform domains
CREATE POLICY "Adminsaas can view all domains"
ON public.email_domains
FOR SELECT
USING (has_role(auth.uid(), 'adminsaas'::app_role));

CREATE POLICY "Adminsaas can create platform domains"
ON public.email_domains
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'adminsaas'::app_role) AND is_platform_domain = true);

CREATE POLICY "Adminsaas can update all domains"
ON public.email_domains
FOR UPDATE
USING (has_role(auth.uid(), 'adminsaas'::app_role));

CREATE POLICY "Adminsaas can delete platform domains"
ON public.email_domains
FOR DELETE
USING (has_role(auth.uid(), 'adminsaas'::app_role) AND is_platform_domain = true);