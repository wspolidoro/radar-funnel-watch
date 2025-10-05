import { Badge } from '@/components/ui/badge';
import type { EmailCategory } from '@/types';

interface EmailCategoryBadgeProps {
  category: EmailCategory;
}

const categoryConfig: Record<EmailCategory, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  onboarding: { label: 'Onboarding', variant: 'default' },
  promo: { label: 'Promoção', variant: 'destructive' },
  educacao: { label: 'Educação', variant: 'secondary' },
  reengajamento: { label: 'Reengajamento', variant: 'outline' },
  sazonal: { label: 'Sazonal', variant: 'default' }
};

export function EmailCategoryBadge({ category }: EmailCategoryBadgeProps) {
  const config = categoryConfig[category];
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
}
