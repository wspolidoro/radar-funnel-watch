-- Enable realtime for data_leak_alerts table
ALTER PUBLICATION supabase_realtime ADD TABLE public.data_leak_alerts;