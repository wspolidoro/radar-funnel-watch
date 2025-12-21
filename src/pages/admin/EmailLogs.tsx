import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  FileText, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ChevronDown,
  ChevronRight,
  Mail,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailLog {
  id: string;
  domain: string | null;
  alias: string | null;
  from_email: string | null;
  from_name: string | null;
  subject: string | null;
  status: string;
  error_message: string | null;
  processing_time_ms: number | null;
  received_at: string;
  metadata: Record<string, unknown> | null;
  newsletter_id: string | null;
}

export default function EmailLogs() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [domainFilter, setDomainFilter] = useState<string>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [isRealtime, setIsRealtime] = useState(true);

  // Fetch logs
  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['email-logs', statusFilter, domainFilter],
    queryFn: async () => {
      let query = supabase
        .from('email_logs')
        .select('*')
        .order('received_at', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      if (domainFilter !== 'all') {
        query = query.eq('domain', domainFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as EmailLog[];
    },
    refetchInterval: isRealtime ? 5000 : false,
  });

  // Get unique domains for filter
  const domains = Array.from(new Set(logs?.map(l => l.domain).filter(Boolean) || []));

  // Realtime subscription
  useEffect(() => {
    if (!isRealtime) return;

    const channel = supabase
      .channel('email-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'email_logs',
        },
        (payload) => {
          console.log('Realtime update:', payload);
          queryClient.invalidateQueries({ queryKey: ['email-logs'] });
          toast({
            title: 'Novo log recebido',
            description: payload.eventType === 'INSERT' ? 'Email processado' : 'Log atualizado',
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRealtime, queryClient]);

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'received':
        return <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" />Recebido</Badge>;
      case 'processed':
        return <Badge className="gap-1 bg-green-500"><CheckCircle2 className="h-3 w-3" />Processado</Badge>;
      case 'error':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.from_email?.toLowerCase().includes(term) ||
      log.subject?.toLowerCase().includes(term) ||
      log.alias?.toLowerCase().includes(term)
    );
  });

  const stats = {
    total: logs?.length || 0,
    processed: logs?.filter(l => l.status === 'processed').length || 0,
    errors: logs?.filter(l => l.status === 'error').length || 0,
    avgTime: logs?.length 
      ? Math.round(logs.reduce((acc, l) => acc + (l.processing_time_ms || 0), 0) / logs.length)
      : 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Logs de Email
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento em tempo real de emails recebidos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isRealtime ? "default" : "outline"}
            size="sm"
            onClick={() => setIsRealtime(!isRealtime)}
          >
            {isRealtime ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Tempo Real
              </>
            ) : (
              'Ativar Tempo Real'
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Processados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{stats.processed}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Erros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{stats.errors}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Tempo Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.avgTime}ms</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email, assunto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="received">Recebido</SelectItem>
                <SelectItem value="processed">Processado</SelectItem>
                <SelectItem value="error">Erro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={domainFilter} onValueChange={setDomainFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Domínio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os domínios</SelectItem>
                {domains.map(domain => (
                  <SelectItem key={domain} value={domain!}>{domain}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Logs Recentes</CardTitle>
          <CardDescription>
            Últimos 100 emails recebidos pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredLogs?.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum log encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' || domainFilter !== 'all' 
                  ? 'Tente ajustar os filtros' 
                  : 'Aguardando emails...'}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8"></TableHead>
                  <TableHead>Recebido</TableHead>
                  <TableHead>De</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Alias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs?.map(log => (
                  <Collapsible key={log.id} asChild>
                    <>
                      <TableRow 
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(log.id)}
                      >
                        <TableCell>
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              {expandedRows.has(log.id) ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="font-medium">
                            {format(new Date(log.received_at), 'HH:mm:ss')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(log.received_at), { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px] truncate">
                            {log.from_name && (
                              <div className="font-medium truncate">{log.from_name}</div>
                            )}
                            <div className="text-sm text-muted-foreground truncate">
                              {log.from_email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[250px]">
                          <div className="truncate" title={log.subject || ''}>
                            {log.subject || '(sem assunto)'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {log.alias?.split('@')[0] || '-'}
                          </code>
                        </TableCell>
                        <TableCell>{getStatusBadge(log.status)}</TableCell>
                        <TableCell>
                          {log.processing_time_ms != null ? (
                            <span className={log.processing_time_ms > 1000 ? 'text-amber-600' : ''}>
                              {log.processing_time_ms}ms
                            </span>
                          ) : '-'}
                        </TableCell>
                      </TableRow>
                      <CollapsibleContent asChild>
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={7}>
                            <div className="p-4 space-y-3">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="font-medium">Alias completo:</span>
                                  <code className="ml-2 bg-background px-2 py-1 rounded">
                                    {log.alias}
                                  </code>
                                </div>
                                <div>
                                  <span className="font-medium">Domínio:</span>
                                  <span className="ml-2">{log.domain}</span>
                                </div>
                                {log.newsletter_id && (
                                  <div>
                                    <span className="font-medium">Newsletter ID:</span>
                                    <code className="ml-2 bg-background px-2 py-1 rounded text-xs">
                                      {log.newsletter_id}
                                    </code>
                                  </div>
                                )}
                                {log.error_message && (
                                  <div className="col-span-2">
                                    <span className="font-medium text-destructive">Erro:</span>
                                    <p className="mt-1 p-2 bg-destructive/10 rounded text-destructive">
                                      {log.error_message}
                                    </p>
                                  </div>
                                )}
                                {log.metadata && Object.keys(log.metadata).length > 0 && (
                                  <div className="col-span-2">
                                    <span className="font-medium">Metadata:</span>
                                    <pre className="mt-1 p-2 bg-background rounded text-xs overflow-auto max-h-32">
                                      {JSON.stringify(log.metadata, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      </CollapsibleContent>
                    </>
                  </Collapsible>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
