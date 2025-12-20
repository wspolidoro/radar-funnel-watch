import { Mail, Inbox, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { DetectedSender } from '@/types';

interface DetectedSenderCardProps {
  sender: DetectedSender;
  onViewDetails: (sender: DetectedSender) => void;
}

const categoryLabels: Record<string, string> = {
  'promotional': 'Promocional',
  'transactional': 'Transacional',
  'newsletter': 'Newsletter',
  'onboarding': 'Onboarding',
  'notification': 'Notificação',
  'educational': 'Educacional',
  'unknown': 'Desconhecido'
};

export const DetectedSenderCard = ({ sender, onViewDetails }: DetectedSenderCardProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg flex items-center gap-2 truncate">
              {sender.fromName || sender.fromEmail}
              {sender.isUnexpected && (
                <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 text-xs shrink-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Suspeito
                </Badge>
              )}
            </CardTitle>
            {sender.fromName && (
              <p className="text-sm text-muted-foreground mt-1 truncate">{sender.fromEmail}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Mail className="h-3 w-3" />
              <span className="text-xs">Emails</span>
            </div>
            <p className="text-2xl font-bold">{sender.emailCount}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Inbox className="h-3 w-3" />
              <span className="text-xs">Aliases</span>
            </div>
            <p className="text-2xl font-bold">{sender.aliasIds.length}</p>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Categorias</p>
          <div className="flex flex-wrap gap-1">
            {sender.categories.slice(0, 3).map(cat => (
              <Badge key={cat} variant="secondary" className="text-xs">
                {categoryLabels[cat] || cat}
              </Badge>
            ))}
            {sender.categories.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{sender.categories.length - 3}
              </Badge>
            )}
            {sender.categories.length === 0 && (
              <span className="text-xs text-muted-foreground">Sem categoria</span>
            )}
          </div>
        </div>

        {/* Last Email */}
        <div className="pt-2 border-t">
          <div className="flex items-center gap-1 text-muted-foreground mb-1">
            <Calendar className="h-3 w-3" />
            <p className="text-xs">Último email</p>
          </div>
          <p className="text-sm font-medium">{formatDate(sender.lastEmailAt)}</p>
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => onViewDetails(sender)}
        >
          Ver detalhes
        </Button>
      </CardContent>
    </Card>
  );
};