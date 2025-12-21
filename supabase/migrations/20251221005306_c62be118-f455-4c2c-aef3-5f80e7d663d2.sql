-- Atualizar políticas RLS para captured_newsletters
-- Permitir acesso via alias_id quando seed_id for nulo

-- Remover políticas existentes
DROP POLICY IF EXISTS "Users can view newsletters from their seeds" ON public.captured_newsletters;
DROP POLICY IF EXISTS "Users can insert newsletters for their seeds" ON public.captured_newsletters;

-- Criar novas políticas que suportam acesso via seed_id OU alias_id
CREATE POLICY "Users can view their newsletters" 
ON public.captured_newsletters 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM email_seeds 
    WHERE email_seeds.id = captured_newsletters.seed_id 
    AND email_seeds.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM email_aliases 
    WHERE email_aliases.id = captured_newsletters.alias_id 
    AND email_aliases.user_id = auth.uid()
  )
);

-- Política de insert precisa permitir inserções do sistema (service role) via webhook
CREATE POLICY "System and users can insert newsletters" 
ON public.captured_newsletters 
FOR INSERT 
WITH CHECK (true);

-- Permitir update para análise de newsletters
CREATE POLICY "Users can update their newsletters" 
ON public.captured_newsletters 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM email_seeds 
    WHERE email_seeds.id = captured_newsletters.seed_id 
    AND email_seeds.user_id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM email_aliases 
    WHERE email_aliases.id = captured_newsletters.alias_id 
    AND email_aliases.user_id = auth.uid()
  )
);