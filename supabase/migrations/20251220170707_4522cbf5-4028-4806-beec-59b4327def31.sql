-- Create table for plan change history
CREATE TABLE public.plan_change_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subscription_id UUID REFERENCES public.saas_subscriptions(id),
  from_plan_id UUID REFERENCES public.saas_plans(id),
  to_plan_id UUID REFERENCES public.saas_plans(id),
  change_type TEXT NOT NULL DEFAULT 'upgrade', -- upgrade, downgrade, initial
  from_price NUMERIC,
  to_price NUMERIC,
  reason TEXT,
  changed_by UUID, -- admin who made the change
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plan_change_history ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Adminsaas can view all plan changes"
ON public.plan_change_history
FOR SELECT
USING (has_role(auth.uid(), 'adminsaas'::app_role));

CREATE POLICY "Adminsaas can manage plan changes"
ON public.plan_change_history
FOR ALL
USING (has_role(auth.uid(), 'adminsaas'::app_role));

CREATE POLICY "Users can view their own plan changes"
ON public.plan_change_history
FOR SELECT
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_plan_change_history_user_id ON public.plan_change_history(user_id);
CREATE INDEX idx_plan_change_history_subscription_id ON public.plan_change_history(subscription_id);