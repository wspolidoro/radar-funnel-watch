import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  PauseCircle, 
  Download,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Crown
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/RoleGuard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  canceled: 'bg-red-500/10 text-red-700 border-red-500/20',
  past_due: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  trialing: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  canceled: 'Cancelado',
  past_due: 'Inadimplente',
  trialing: 'Teste'
};

const statusIcons: Record<string, React.ReactNode> = {
  active: <CheckCircle className="h-3 w-3" />,
  canceled: <XCircle className="h-3 w-3" />,
  past_due: <Clock className="h-3 w-3" />,
  trialing: <Clock className="h-3 w-3" />
};

type SubscriptionWithDetails = {
  id: string;
  user_id: string;
  status: string;
  billing_cycle: string | null;
  current_period_start: string;
  current_period_end: string | null;
  canceled_at: string | null;
  created_at: string;
  saas_plans: {
    id: string;
    name: string;
    price_monthly: number;
  } | null;
  profiles: {
    full_name: string | null;
  } | null;
};

export default function AdminClients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [planFilter, setPlanFilter] = useState('todos');
  const [selectedSubscription, setSelectedSubscription] = useState<SubscriptionWithDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch subscriptions with user profiles and plans
  const { data: subscriptions, isLoading } = useQuery({
    queryKey: ['admin-subscriptions', statusFilter, planFilter],
    queryFn: async () => {
      let query = supabase
        .from('saas_subscriptions')
        .select(`
          *,
          saas_plans(id, name, price_monthly),
          profiles:user_id(full_name)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      if (planFilter !== 'todos') {
        query = query.eq('plan_id', planFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as unknown as SubscriptionWithDetails[];
    }
  });

  // Fetch plans for filter
  const { data: plans } = useQuery({
    queryKey: ['saas-plans-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('id, name')
        .order('price_monthly');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('saas_subscriptions')
        .update({ 
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Assinatura cancelada com sucesso');
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast.error('Erro ao cancelar assinatura: ' + error.message);
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: string) => {
      const { error } = await supabase
        .from('saas_subscriptions')
        .update({ 
          status: 'active',
          canceled_at: null
        })
        .eq('id', subscriptionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
      toast.success('Assinatura reativada com sucesso');
      setIsDetailsOpen(false);
    },
    onError: (error) => {
      toast.error('Erro ao reativar assinatura: ' + error.message);
    }
  });

  // Filter subscriptions by search
  const filteredSubscriptions = subscriptions?.filter(sub => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    const userName = (sub.profiles as any)?.full_name?.toLowerCase() || '';
    const planName = sub.saas_plans?.name?.toLowerCase() || '';
    return userName.includes(searchLower) || planName.includes(searchLower) || sub.user_id.toLowerCase().includes(searchLower);
  }) || [];

  const handleViewDetails = (subscription: SubscriptionWithDetails) => {
    setSelectedSubscription(subscription);
    setIsDetailsOpen(true);
  };

  const handleExport = () => {
    if (!filteredSubscriptions.length) {
      toast.error('Nenhum dado para exportar');
      return;
    }

    const csv = 'ID,Usuário,Plano,Status,Ciclo,Início,Fim,Criado em\n' +
      filteredSubscriptions.map(s => 
        `"${s.id}","${(s.profiles as any)?.full_name || s.user_id}","${s.saas_plans?.name || '-'}","${statusLabels[s.status] || s.status}","${s.billing_cycle || '-'}","${format(new Date(s.current_period_start), 'dd/MM/yyyy')}","${s.current_period_end ? format(new Date(s.current_period_end), 'dd/MM/yyyy') : '-'}","${format(new Date(s.created_at), 'dd/MM/yyyy')}"`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exportação concluída');
  };

  // Stats
  const stats = {
    total: subscriptions?.length || 0,
    active: subscriptions?.filter(s => s.status === 'active').length || 0,
    canceled: subscriptions?.filter(s => s.status === 'canceled').length || 0,
    mrr: subscriptions?.filter(s => s.status === 'active').reduce((acc, s) => acc + (s.saas_plans?.price_monthly || 0), 0) || 0
  };

  return (
    <RoleGuard requiredRole="adminsaas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Clientes</h1>
            <p className="text-muted-foreground">
              Gerencie assinantes e suas assinaturas
            </p>
          </div>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-600">Ativos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-600">Cancelados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.canceled}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-primary">MRR</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                R$ {stats.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="canceled">Cancelado</SelectItem>
                  <SelectItem value="past_due">Inadimplente</SelectItem>
                  <SelectItem value="trialing">Teste</SelectItem>
                </SelectContent>
              </Select>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-full md:w-40">
                  <SelectValue placeholder="Plano" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {plans?.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredSubscriptions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-muted p-6 mb-4">
                  <Users className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">
                  Nenhum cliente encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Não há assinaturas cadastradas ainda.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ciclo</TableHead>
                    <TableHead>Período Atual</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {(subscription.profiles as any)?.full_name || 'Sem nome'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {subscription.user_id.slice(0, 8)}...
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-primary" />
                          <span>{subscription.saas_plans?.name || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[subscription.status]}>
                          {statusIcons[subscription.status]}
                          <span className="ml-1">{statusLabels[subscription.status] || subscription.status}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {subscription.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(subscription.current_period_start), 'dd/MM/yy', { locale: ptBR })}
                          {subscription.current_period_end && (
                            <> - {format(new Date(subscription.current_period_end), 'dd/MM/yy', { locale: ptBR })}</>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(subscription.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(subscription)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Details Sheet */}
        <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <SheetContent className="w-full sm:max-w-lg">
            {selectedSubscription && (
              <>
                <SheetHeader>
                  <SheetTitle>Detalhes da Assinatura</SheetTitle>
                  <SheetDescription>
                    Informações completas do cliente
                  </SheetDescription>
                </SheetHeader>

                <div className="mt-6 space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label className="text-muted-foreground">Cliente</Label>
                      <p className="text-lg font-medium">
                        {(selectedSubscription.profiles as any)?.full_name || 'Sem nome'}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedSubscription.user_id}</p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Plano</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <Crown className="h-5 w-5 text-primary" />
                        <span className="text-lg font-medium">
                          {selectedSubscription.saas_plans?.name || '-'}
                        </span>
                        <Badge variant="secondary">
                          R$ {selectedSubscription.saas_plans?.price_monthly?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}/mês
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className={`text-base px-3 py-1 ${statusColors[selectedSubscription.status]}`}>
                          {statusIcons[selectedSubscription.status]}
                          <span className="ml-1">{statusLabels[selectedSubscription.status] || selectedSubscription.status}</span>
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Ciclo de Cobrança</Label>
                      <p className="text-lg">
                        {selectedSubscription.billing_cycle === 'yearly' ? 'Anual' : 'Mensal'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Período Atual</Label>
                      <p className="text-lg">
                        {format(new Date(selectedSubscription.current_period_start), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        {selectedSubscription.current_period_end && (
                          <> até {format(new Date(selectedSubscription.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</>
                        )}
                      </p>
                    </div>

                    <div>
                      <Label className="text-muted-foreground">Data de Criação</Label>
                      <p className="text-lg">
                        {format(new Date(selectedSubscription.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    {selectedSubscription.canceled_at && (
                      <div>
                        <Label className="text-muted-foreground">Cancelado em</Label>
                        <p className="text-lg text-red-600">
                          {format(new Date(selectedSubscription.canceled_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4">
                    {selectedSubscription.status === 'active' ? (
                      <Button 
                        variant="destructive" 
                        className="flex-1"
                        onClick={() => cancelMutation.mutate(selectedSubscription.id)}
                        disabled={cancelMutation.isPending}
                      >
                        <PauseCircle className="h-4 w-4" />
                        Cancelar Assinatura
                      </Button>
                    ) : selectedSubscription.status === 'canceled' ? (
                      <Button 
                        variant="default" 
                        className="flex-1"
                        onClick={() => reactivateMutation.mutate(selectedSubscription.id)}
                        disabled={reactivateMutation.isPending}
                      >
                        <CheckCircle className="h-4 w-4" />
                        Reativar Assinatura
                      </Button>
                    ) : null}
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </RoleGuard>
  );
}
