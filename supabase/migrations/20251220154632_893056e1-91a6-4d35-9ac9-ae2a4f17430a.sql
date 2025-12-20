-- Create plans table for SaaS management
CREATE TABLE public.saas_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly DECIMAL(10,2),
  max_aliases INTEGER DEFAULT 10,
  max_seeds INTEGER DEFAULT 5,
  features JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create clients/subscriptions table
CREATE TABLE public.saas_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plan_id UUID REFERENCES public.saas_plans(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'suspended', 'trial', 'expired')),
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create payments table
CREATE TABLE public.saas_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subscription_id UUID REFERENCES public.saas_subscriptions(id),
  user_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
  payment_method TEXT,
  payment_provider TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data leak alerts table
CREATE TABLE public.data_leak_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  alias_id UUID REFERENCES public.email_aliases(id),
  newsletter_id UUID REFERENCES public.captured_newsletters(id),
  from_email TEXT NOT NULL,
  expected_domain TEXT,
  actual_domain TEXT NOT NULL,
  severity TEXT DEFAULT 'warning' CHECK (severity IN ('low', 'warning', 'critical')),
  is_read BOOLEAN DEFAULT false,
  is_notified BOOLEAN DEFAULT false,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saas_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_leak_alerts ENABLE ROW LEVEL SECURITY;

-- Plans policies (public read, admin write)
CREATE POLICY "Plans are viewable by everyone" 
ON public.saas_plans 
FOR SELECT 
USING (true);

CREATE POLICY "Only adminsaas can manage plans" 
ON public.saas_plans 
FOR ALL 
USING (has_role(auth.uid(), 'adminsaas'));

-- Subscriptions policies
CREATE POLICY "Users can view their own subscription" 
ON public.saas_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Adminsaas can view all subscriptions" 
ON public.saas_subscriptions 
FOR SELECT 
USING (has_role(auth.uid(), 'adminsaas'));

CREATE POLICY "Adminsaas can manage all subscriptions" 
ON public.saas_subscriptions 
FOR ALL 
USING (has_role(auth.uid(), 'adminsaas'));

-- Payments policies
CREATE POLICY "Users can view their own payments" 
ON public.saas_payments 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Adminsaas can view all payments" 
ON public.saas_payments 
FOR SELECT 
USING (has_role(auth.uid(), 'adminsaas'));

CREATE POLICY "Adminsaas can manage all payments" 
ON public.saas_payments 
FOR ALL 
USING (has_role(auth.uid(), 'adminsaas'));

-- Data leak alerts policies
CREATE POLICY "Users can view their own alerts" 
ON public.data_leak_alerts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts" 
ON public.data_leak_alerts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "System can create alerts" 
ON public.data_leak_alerts 
FOR INSERT 
WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_saas_plans_updated_at
BEFORE UPDATE ON public.saas_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_saas_subscriptions_updated_at
BEFORE UPDATE ON public.saas_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default plans
INSERT INTO public.saas_plans (name, description, price_monthly, price_yearly, max_aliases, max_seeds, features, is_featured) VALUES
('Gratuito', 'Plano básico para começar', 0, 0, 5, 2, '["5 aliases", "2 seeds", "Detecção básica de vazamento"]', false),
('Pro', 'Para profissionais de marketing', 49.90, 479.00, 50, 10, '["50 aliases", "10 seeds", "Detecção avançada", "Relatórios", "Suporte prioritário"]', true),
('Enterprise', 'Para grandes equipes', 199.90, 1919.00, -1, -1, '["Aliases ilimitados", "Seeds ilimitados", "API access", "SLA dedicado", "Suporte 24/7"]', false);