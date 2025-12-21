-- Alterar captured_newsletters para permitir seed_id nulo
-- Isso é necessário porque emails podem ser recebidos via webhook sem uma conta conectada (seed)
ALTER TABLE public.captured_newsletters 
ALTER COLUMN seed_id DROP NOT NULL;