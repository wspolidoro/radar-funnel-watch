import { Badge } from '@/components/ui/badge';
import type { EmailCategory } from '@/types';

const categoryConfig: Record<EmailCategory, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  onboarding: { label: 'Onboarding', variant: 'default' },
  promo: { label: 'Promo', variant: 'destructive' },
  educacao: { label: 'Educação', variant: 'secondary' },
  reengajamento: { label: 'Reengajamento', variant: 'outline' },
  sazonal: { label: 'Sazonal', variant: 'secondary' }
};

interface EmailCategoryBadgeProps {
  category: EmailCategory;
}

export const EmailCategoryBadge: React.FC<EmailCategoryBadgeProps> = ({ category }) => {
  const config = categoryConfig[category];
  
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.label}
    </Badge>
  );
};
