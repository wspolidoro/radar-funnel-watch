-- Restrict client-side SELECT access to sensitive secret columns.
-- service_role (edge functions) bypasses these column grants.

-- profiles.gpt_api_key
REVOKE SELECT ON public.profiles FROM authenticated;
GRANT SELECT (
  id, user_id, full_name, avatar_url, created_at, updated_at, ai_credits, use_own_gpt
) ON public.profiles TO authenticated;

-- email_domains.webhook_secret
REVOKE SELECT ON public.email_domains FROM authenticated;
GRANT SELECT (
  id, user_id, domain, provider, is_verified, is_active, is_platform_domain,
  dns_status, dns_verified_at, mx_records, created_at, updated_at
) ON public.email_domains TO authenticated;

-- email_seeds.encrypted_password
REVOKE SELECT ON public.email_seeds FROM authenticated;
GRANT SELECT (
  id, user_id, name, email, provider, imap_host, imap_port, use_ssl,
  is_active, last_sync_at, created_at, updated_at
) ON public.email_seeds TO authenticated;