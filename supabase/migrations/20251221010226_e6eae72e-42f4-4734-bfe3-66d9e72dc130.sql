-- Habilitar realtime para email_aliases para notificar quando novos emails chegam
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_aliases;