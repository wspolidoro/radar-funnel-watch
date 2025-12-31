import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Mail, Calendar, Tag, MousePointerClick } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmailThumbnail } from '@/components/EmailThumbnail';
import { EmailCategoryBadge } from '@/components/EmailCategoryBadge';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

export interface FunnelEmailCardData {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  html_content: string | null;
  received_at: string;
  category: string | null;
  ctas: any;
}

interface FunnelEmailCardProps {
  email: FunnelEmailCardData;
  isDraggable?: boolean;
  isInTimeline?: boolean;
  dayOffset?: number;
  index?: number;
  funnelColor?: string;
  firstEmailDate?: Date;
  onClick?: () => void;
}

export const FunnelEmailCard: React.FC<FunnelEmailCardProps> = ({
  email,
  isDraggable = true,
  isInTimeline = false,
  dayOffset,
  index,
  funnelColor = '#3b82f6',
  firstEmailDate,
  onClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: email.id,
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Calculate day offset if not provided
  const computedDayOffset = dayOffset ?? (firstEmailDate 
    ? differenceInDays(new Date(email.received_at), firstEmailDate) 
    : 0);

  // Count CTAs
  const ctaCount = Array.isArray(email.ctas) ? email.ctas.length : 0;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative border rounded-lg bg-card overflow-hidden transition-all",
        isDragging && "opacity-50 shadow-2xl scale-105 z-50",
        isDraggable && "cursor-grab active:cursor-grabbing",
        isInTimeline && "ring-2 ring-primary/20",
        !isDragging && "hover:shadow-md"
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      {isDraggable && (
        <div
          {...attributes}
          {...listeners}
          className="absolute top-2 right-2 z-10 p-1.5 rounded bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {/* Thumbnail */}
      <div className="aspect-[4/3] relative bg-white overflow-hidden">
        <EmailThumbnail
          htmlContent={email.html_content || undefined}
          subject={email.subject}
          className="w-full h-full"
        />
        
        {/* Day offset badge */}
        {isInTimeline && (
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: funnelColor }}
          >
            D+{computedDayOffset}
          </div>
        )}

        {/* Index badge for timeline */}
        {isInTimeline && typeof index === 'number' && (
          <div 
            className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: funnelColor }}
          >
            {index + 1}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="p-3 space-y-2">
        {/* Subject */}
        <h4 className="text-sm font-medium line-clamp-2 leading-tight min-h-[2.5rem]">
          {email.subject}
        </h4>

        {/* Sender */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {email.from_name || email.from_email}
          </span>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>
            {format(new Date(email.received_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        {/* Category and CTAs */}
        <div className="flex items-center gap-2 flex-wrap">
          {email.category && (
            <EmailCategoryBadge category={email.category} size="sm" />
          )}
          {ctaCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <MousePointerClick className="h-2.5 w-2.5" />
              {ctaCount} CTA{ctaCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Non-draggable version for use outside dnd context
export const StaticFunnelEmailCard: React.FC<Omit<FunnelEmailCardProps, 'isDraggable'>> = (props) => {
  const { email, isInTimeline, dayOffset, index, funnelColor = '#3b82f6', firstEmailDate, onClick } = props;

  const computedDayOffset = dayOffset ?? (firstEmailDate 
    ? differenceInDays(new Date(email.received_at), firstEmailDate) 
    : 0);

  const ctaCount = Array.isArray(email.ctas) ? email.ctas.length : 0;

  return (
    <div
      className={cn(
        "group relative border rounded-lg bg-card overflow-hidden transition-all hover:shadow-md cursor-pointer",
        isInTimeline && "ring-2 ring-primary/20"
      )}
      onClick={onClick}
    >
      <div className="aspect-[4/3] relative bg-white overflow-hidden">
        <EmailThumbnail
          htmlContent={email.html_content || undefined}
          subject={email.subject}
          className="w-full h-full"
        />
        
        {isInTimeline && (
          <div 
            className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: funnelColor }}
          >
            D+{computedDayOffset}
          </div>
        )}

        {isInTimeline && typeof index === 'number' && (
          <div 
            className="absolute bottom-2 left-2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: funnelColor }}
          >
            {index + 1}
          </div>
        )}
      </div>

      <div className="p-3 space-y-2">
        <h4 className="text-sm font-medium line-clamp-2 leading-tight min-h-[2.5rem]">
          {email.subject}
        </h4>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Mail className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {email.from_name || email.from_email}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>
            {format(new Date(email.received_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {email.category && (
            <EmailCategoryBadge category={email.category} size="sm" />
          )}
          {ctaCount > 0 && (
            <Badge variant="outline" className="text-xs gap-1">
              <MousePointerClick className="h-2.5 w-2.5" />
              {ctaCount} CTA{ctaCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
