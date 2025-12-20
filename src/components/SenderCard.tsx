import { TrendingUp, Activity, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { Sender } from '@/types';
import { SparklineChart } from './SparklineChart';

interface SenderCardProps {
  sender: Sender;
  onViewDetails: (sender: Sender) => void;
}

const statusColors = {
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  paused: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  error: 'bg-red-500/10 text-red-700 border-red-500/20'
};

const statusLabels = {
  active: 'Ativo',
  paused: 'Pausado',
  error: 'Erro'
};

export const SenderCard = ({ sender, onViewDetails }: SenderCardProps) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {sender.name}
              {sender.hasNewActivity && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                  <Zap className="h-3 w-3 mr-1" />
                  Novidade
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{sender.mainDomain}</p>
          </div>
          <Badge variant="outline" className={statusColors[sender.status]}>
            {statusLabels[sender.status]}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              <span className="text-xs">Funis</span>
            </div>
            <p className="text-2xl font-bold">{sender.activeFunnels}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Activity className="h-3 w-3" />
              <span className="text-xs">E-mails 30d</span>
            </div>
            <p className="text-2xl font-bold">{sender.emailsLast30d}</p>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span className="text-xs">Intervalo</span>
            </div>
            <p className="text-2xl font-bold">{sender.avgIntervalHours || 0}h</p>
          </div>
        </div>

        {/* Sparkline */}
        {sender.sparklineData && sender.sparklineData.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Atividade nos últimos 30 dias</p>
            <SparklineChart data={sender.sparklineData} />
          </div>
        )}

        {/* Last Email */}
        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground mb-1">Último envio</p>
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
