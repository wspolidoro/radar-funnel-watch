import { Badge } from '@/components/ui/badge';
import type { EmailCategory } from '@/types';
import { cn } from '@/lib/utils';

interface EmailCategoryBadgeProps {
  category: string;
  size?: 'sm' | 'default';
}

const categoryConfig: Record<EmailCategory, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  onboarding: { label: 'Onboarding', variant: 'default' },
  promo: { label: 'Promoção', variant: 'destructive' },
  educacao: { label: 'Educação', variant: 'secondary' },
  reengajamento: { label: 'Reengajamento', variant: 'outline' },
  sazonal: { label: 'Sazonal', variant: 'default' }
};

export function EmailCategoryBadge({ category, size = 'default' }: EmailCategoryBadgeProps) {
  const config = categoryConfig[category as EmailCategory];
  
  if (!config) {
    return (
      <Badge variant="outline" className={cn("capitalize", size === 'sm' && "text-[10px] px-1.5 py-0")}>
        {category}
      </Badge>
    );
  }

  return (
    <Badge 
      variant={config.variant} 
      className={cn("text-xs", size === 'sm' && "text-[10px] px-1.5 py-0")}
    >
      {config.label}
    </Badge>
  );
}
