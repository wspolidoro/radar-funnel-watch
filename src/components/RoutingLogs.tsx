import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, AlertCircle, CheckCircle2, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RoutingLogsProps {
  domain: string;
}

export const RoutingLogs = ({ domain }: RoutingLogsProps) => {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['email-routing-logs', domain],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .eq('domain', domain)
        .order('received_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data;
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
        return (
          <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Processado
          </Badge>
        );
      case 'received':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 gap-1">
            <Clock className="h-3 w-3" /> Recebido
          </Badge>
        );
      case 'error':
      case 'failed':
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" /> Erro
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando logs de roteamento...</p>
      </div>
    );
  }

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-lg font-bold flex items-center gap-2">
          Últimas Requisições (Webhook Maileroo)
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Remetente</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Processamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!logs || logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhuma requisição recebida para este domínio ainda.
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {log.received_at ? format(new Date(log.received_at), 'dd/MM HH:mm:ss', { locale: ptBR }) : '-'}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      <div className="flex flex-col">
                        <span className="font-medium truncate">{log.from_name || 'Sem nome'}</span>
                        <span className="text-xs text-muted-foreground truncate">{log.from_email}</span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[250px] truncate">
                      <span className="text-sm truncate block">{log.subject}</span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(log.status)}
                      {log.error_message && (
                        <p className="text-[10px] text-destructive mt-1 max-w-[150px] truncate" title={log.error_message}>
                          {log.error_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {log.processing_time_ms ? `${log.processing_time_ms}ms` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
