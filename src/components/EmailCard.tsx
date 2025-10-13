import { Mail, Calendar, Tag, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { EmailCategoryBadge } from './EmailCategoryBadge';
import { CTAChip } from './CTAChip';
import type { Email } from '@/types';

interface EmailCardProps {
  email: Email;
  onClick?: () => void;
  onView?: () => void;
}

export const EmailCard: React.FC<EmailCardProps> = ({ email, onClick, onView }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Card 
      className="hover:shadow-md transition-slow border-border hover:border-primary/50 group"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div 
            className="flex-1 min-w-0 cursor-pointer" 
            onClick={onClick}
          >
            <h3 className="font-semibold text-sm mb-1 line-clamp-1">
              {email.subject}
            </h3>
            {email.preheader && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {email.preheader}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {email.dayOffset !== undefined && (
              <div className="px-2 py-1 bg-primary/10 rounded text-xs font-medium text-primary">
                D+{email.dayOffset}
              </div>
            )}
            {onView && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Mail className="h-3 w-3" />
            <span className="truncate">{email.from}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{formatDate(email.sentAt)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <EmailCategoryBadge category={email.category} />
          {email.isAbVariant && (
            <span className="px-2 py-0.5 bg-warning/10 text-warning text-xs rounded font-medium border border-warning/20">
              Teste A/B {email.abVariantName && `· ${email.abVariantName}`}
            </span>
          )}
        </div>

        {email.topics.length > 0 && (
          <div className="flex items-start gap-2">
            <Tag className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
            <div className="flex flex-wrap gap-1">
              {email.topics.map((topic, idx) => (
                <span 
                  key={idx} 
                  className="text-xs px-2 py-0.5 bg-muted rounded text-muted-foreground"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {email.ctas.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            {email.ctas.map((cta, idx) => (
              <CTAChip key={idx} cta={cta} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
