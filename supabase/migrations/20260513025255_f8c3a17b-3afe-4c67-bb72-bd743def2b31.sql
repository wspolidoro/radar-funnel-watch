ALTER TABLE public.captured_newsletters 
ADD COLUMN IF NOT EXISTS main_topics TEXT[],
ADD COLUMN IF NOT EXISTS marketing_insights JSONB,
ADD COLUMN IF NOT EXISTS target_audience TEXT,
ADD COLUMN IF NOT EXISTS cta_analysis JSONB;

-- Atualizar comentários para documentação
COMMENT ON COLUMN public.captured_newsletters.main_topics IS 'Principais tópicos identificados pela IA no conteúdo do email.';
COMMENT ON COLUMN public.captured_newsletters.marketing_insights IS 'Insights estratégicos de marketing extraídos pela IA.';
COMMENT ON COLUMN public.captured_newsletters.target_audience IS 'Público-alvo inferido pela IA baseado no conteúdo e tom do email.';
COMMENT ON COLUMN public.captured_newsletters.cta_analysis IS 'Análise detalhada dos Calls to Action encontrados no email.';