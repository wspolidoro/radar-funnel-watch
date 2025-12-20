import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  CreditCard, 
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_method: string | null;
  payment_provider: string | null;
  paid_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
  plan_name?: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  completed: { label: 'Pago', color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle },
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', icon: Clock },
  failed: { label: 'Falhou', color: 'bg-red-500/10 text-red-700 border-red-500/20', icon: XCircle },
  refunded: { label: 'Reembolsado', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20', icon: RefreshCw }
};

const methodLabels: Record<string, string> = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto',
  stripe: 'Stripe'
};

export default function AdminPayments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['admin-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_payments')
        .select(`
          *,
          saas_subscriptions (
            user_id,
            saas_plans (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Get user emails from profiles
      const userIds = [...new Set(data?.map(p => p.user_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      return (data || []).map(p => ({
        ...p,
        user_name: profileMap.get(p.user_id) || 'Usuário',
        plan_name: (p.saas_subscriptions as any)?.saas_plans?.name || '-'
      })) as Payment[];
    }
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = 
      payment.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      payment.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRevenue: payments
      .filter(p => p.status === 'completed')
      .reduce((acc, p) => acc + Number(p.amount), 0),
    pendingAmount: payments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + Number(p.amount), 0),
    transactionsCount: payments.length,
    successRate: payments.length > 0 
      ? Math.round((payments.filter(p => p.status === 'completed').length / payments.length) * 100)
      : 0
  };

  const handleExport = () => {
    const csv = 'ID,Usuário,Valor,Status,Plano,Data,Método\n' +
      filteredPayments.map(p => 
        `${p.id},"${p.user_name}",${p.amount},${statusConfig[p.status]?.label || p.status},${p.plan_name},${new Date(p.created_at).toLocaleDateString('pt-BR')},${methodLabels[p.payment_method || ''] || p.payment_method || '-'}`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Exportação concluída');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Pagamentos
          </h1>
          <p className="text-muted-foreground">
            Gerencie transações e faturamento
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={filteredPayments.length === 0}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              R$ {stats.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              R$ {stats.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.transactionsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.successRate}%</p>
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
                placeholder="Buscar por usuário ou ID..."
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
                <SelectItem value="completed">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="refunded">Reembolsados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
          <CardDescription>
            {filteredPayments.length} transação{filteredPayments.length !== 1 ? 'ões' : ''} encontrada{filteredPayments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredPayments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Nenhuma transação encontrada
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment) => {
                  const config = statusConfig[payment.status] || statusConfig.pending;
                  const StatusIcon = config.icon;
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{payment.user_name}</span>
                          <span className="text-xs text-muted-foreground">{payment.id.slice(0, 8)}...</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{payment.plan_name}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {methodLabels[payment.payment_method || ''] || payment.payment_method || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={config.color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {formatDate(payment.created_at)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
