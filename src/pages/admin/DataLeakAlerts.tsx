import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Bell,
  BellOff,
  Filter,
  Search,
  Eye,
  Mail,
  Shield,
  ShieldAlert,
  ShieldX
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/RoleGuard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const severityConfig: Record<string, { color: string; icon: typeof Shield; label: string }> = {
  low: { 
    color: 'bg-blue-500/10 text-blue-700 border-blue-500/20', 
    icon: Shield, 
    label: 'Baixa' 
  },
  warning: { 
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', 
    icon: ShieldAlert, 
    label: 'Média' 
  },
  critical: { 
    color: 'bg-red-500/10 text-red-700 border-red-500/20', 
    icon: ShieldX, 
    label: 'Crítica' 
  }
};

const statusConfig: Record<string, { color: string; icon: typeof Clock; label: string }> = {
  pending: { 
    color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', 
    icon: Clock, 
    label: 'Pendente' 
  },
  notified: { 
    color: 'bg-green-500/10 text-green-700 border-green-500/20', 
    icon: CheckCircle, 
    label: 'Notificado' 
  },
  read: { 
    color: 'bg-gray-500/10 text-gray-700 border-gray-500/20', 
    icon: Eye, 
    label: 'Lido' 
  }
};

export default function DataLeakAlerts() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch all alerts
  const { data: alerts, isLoading } = useQuery({
    queryKey: ['admin-data-leak-alerts', severityFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('data_leak_alerts')
        .select(`
          *,
          email_aliases(alias, name)
        `)
        .order('created_at', { ascending: false });

      if (severityFilter !== 'all') {
        query = query.eq('severity', severityFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Apply status filter client-side since it's computed
      let filtered = data || [];
      if (statusFilter !== 'all') {
        if (statusFilter === 'notified') {
          filtered = filtered.filter(a => a.is_notified);
        } else if (statusFilter === 'read') {
          filtered = filtered.filter(a => a.is_read && !a.is_notified);
        } else if (statusFilter === 'pending') {
          filtered = filtered.filter(a => !a.is_read && !a.is_notified);
        }
      }
      
      return filtered;
    }
  });

  // Notify mutation
  const notifyMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const alert = alerts?.find(a => a.id === alertId);
      if (!alert) throw new Error('Alert not found');

      // Call the notify edge function
      const { error } = await supabase.functions.invoke('notify-data-leak', {
        body: {
          alertId,
          userId: alert.user_id,
          fromEmail: alert.from_email,
          actualDomain: alert.actual_domain,
          expectedDomain: alert.expected_domain,
          severity: alert.severity
        }
      });

      if (error) throw error;

      // Update the alert status
      await supabase
        .from('data_leak_alerts')
        .update({ is_notified: true, notified_at: new Date().toISOString() })
        .eq('id', alertId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data-leak-alerts'] });
      toast.success('Notificação enviada com sucesso');
    },
    onError: (error) => {
      toast.error('Erro ao enviar notificação: ' + error.message);
    }
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('data_leak_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-data-leak-alerts'] });
    }
  });

  // Filter by search
  const filteredAlerts = alerts?.filter(alert => 
    alert.from_email.toLowerCase().includes(search.toLowerCase()) ||
    alert.actual_domain.toLowerCase().includes(search.toLowerCase()) ||
    (alert.expected_domain?.toLowerCase().includes(search.toLowerCase()))
  );

  // Stats
  const stats = {
    total: alerts?.length || 0,
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    pending: alerts?.filter(a => !a.is_notified && !a.is_read).length || 0,
    notified: alerts?.filter(a => a.is_notified).length || 0
  };

  const getStatus = (alert: any) => {
    if (alert.is_notified) return 'notified';
    if (alert.is_read) return 'read';
    return 'pending';
  };

  return (
    <RoleGuard requiredRole="adminsaas">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            Alertas de Vazamento
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitore e gerencie alertas de vazamento de dados
          </p>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Total de Alertas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-red-600">
                <ShieldX className="h-4 w-4" />
                Críticos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
                <Clock className="h-4 w-4" />
                Pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
                <Bell className="h-4 w-4" />
                Notificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.notified}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por email ou domínio..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Severidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas severidades</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="warning">Média</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos status</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="read">Lido</SelectItem>
                  <SelectItem value="notified">Notificado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alertas</CardTitle>
            <CardDescription>
              {filteredAlerts?.length || 0} alertas encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredAlerts && filteredAlerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Email Remetente</TableHead>
                    <TableHead>Domínio Detectado</TableHead>
                    <TableHead>Domínio Esperado</TableHead>
                    <TableHead>Alias</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlerts.map((alert) => {
                    const severity = severityConfig[alert.severity || 'warning'];
                    const status = getStatus(alert);
                    const statusInfo = statusConfig[status];
                    const SeverityIcon = severity?.icon || ShieldAlert;
                    const StatusIcon = statusInfo?.icon || Clock;

                    return (
                      <TableRow key={alert.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            {alert.from_email}
                          </div>
                        </TableCell>
                        <TableCell className="text-red-600 font-medium">
                          {alert.actual_domain}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {alert.expected_domain || '-'}
                        </TableCell>
                        <TableCell>
                          {(alert.email_aliases as any)?.name || (alert.email_aliases as any)?.alias || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={severity?.color}>
                            <SeverityIcon className="h-3 w-3 mr-1" />
                            {severity?.label || alert.severity}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo?.color}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo?.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {!alert.is_read && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markReadMutation.mutate(alert.id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                            {!alert.is_notified && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => notifyMutation.mutate(alert.id)}
                                disabled={notifyMutation.isPending}
                              >
                                <Bell className="h-4 w-4 mr-1" />
                                Notificar
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Nenhum alerta encontrado</p>
                <p className="text-sm">Ajuste os filtros ou aguarde novos alertas</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
