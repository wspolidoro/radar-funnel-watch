import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { CTA } from '@/types';

interface CTAChipProps {
  cta: CTA;
}

export const CTAChip: React.FC<CTAChipProps> = ({ cta }) => {
  const truncateUrl = (url: string, maxLength: number = 40) => {
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength) + '...';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className="gap-1 cursor-pointer hover:bg-accent transition-base"
          >
            <ExternalLink className="h-3 w-3" />
            <span>{cta.text}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs break-all">
          <p className="text-xs">{cta.url}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
