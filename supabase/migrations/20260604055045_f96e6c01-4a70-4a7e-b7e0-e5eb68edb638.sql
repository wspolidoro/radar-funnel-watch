
-- ai_usage_log: restrict INSERT to owner (service_role bypasses RLS)
DROP POLICY IF EXISTS "System can insert AI usage logs" ON public.ai_usage_log;
CREATE POLICY "Users can insert their own AI usage"
ON public.ai_usage_log FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- captured_newsletters: restrict INSERT to owner via seed/alias (service_role bypasses RLS)
DROP POLICY IF EXISTS "System and users can insert newsletters" ON public.captured_newsletters;
CREATE POLICY "Users can insert their newsletters"
ON public.captured_newsletters FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.email_seeds WHERE email_seeds.id = captured_newsletters.seed_id AND email_seeds.user_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM public.email_aliases WHERE email_aliases.id = captured_newsletters.alias_id AND email_aliases.user_id = auth.uid()))
);

-- connectivity_tests: restrict INSERT/UPDATE to owner (service_role bypasses RLS)
DROP POLICY IF EXISTS "System can insert connectivity tests" ON public.connectivity_tests;
DROP POLICY IF EXISTS "System can update connectivity tests" ON public.connectivity_tests;
CREATE POLICY "Users can insert their own connectivity tests"
ON public.connectivity_tests FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own connectivity tests"
ON public.connectivity_tests FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- data_leak_alerts: restrict INSERT to owner (service_role bypasses RLS)
DROP POLICY IF EXISTS "System can create alerts" ON public.data_leak_alerts;
CREATE POLICY "Users can create their own alerts"
ON public.data_leak_alerts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- email_logs: remove unrestricted INSERT/UPDATE (only service_role should write)
DROP POLICY IF EXISTS "System can insert email logs" ON public.email_logs;
DROP POLICY IF EXISTS "System can update email logs" ON public.email_logs;

-- email_logs: remove from realtime publication to prevent cross-user leaks
ALTER PUBLICATION supabase_realtime DROP TABLE public.email_logs;

-- user_roles: explicit restrictive safeguard against self-granted roles
CREATE POLICY "Only adminsaas can insert roles (restrictive)"
ON public.user_roles AS RESTRICTIVE FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'adminsaas'::app_role));
