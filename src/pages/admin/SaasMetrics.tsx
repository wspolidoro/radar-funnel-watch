import { useQuery } from '@tanstack/react-query';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  CreditCard,
  UserMinus,
  Calendar,
  BarChart3
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays, subMonths, startOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useState, useMemo } from 'react';
import { RoleGuard } from '@/components/RoleGuard';

export default function SaasMetrics() {
  const [period, setPeriod] = useState<string>('6');

  // Fetch subscriptions data
  const { data: subscriptions, isLoading: loadingSubscriptions } = useQuery({
    queryKey: ['saas-subscriptions-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_subscriptions')
        .select('*, saas_plans(name, price_monthly)');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch payments data
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['saas-payments-metrics', period],
    queryFn: async () => {
      const startDate = subMonths(new Date(), parseInt(period));
      const { data, error } = await supabase
        .from('saas_payments')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!subscriptions || !payments) return null;

    const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
    const canceledSubscriptions = subscriptions.filter(s => s.status === 'canceled');
    
    // MRR (Monthly Recurring Revenue)
    const mrr = activeSubscriptions.reduce((acc, sub) => {
      const plan = sub.saas_plans as any;
      return acc + (plan?.price_monthly || 0);
    }, 0);

    // Churn rate (canceled / total * 100)
    const churnRate = subscriptions.length > 0 
      ? (canceledSubscriptions.length / subscriptions.length) * 100 
      : 0;

    // Total revenue from payments
    const totalRevenue = payments
      .filter(p => p.status === 'paid')
      .reduce((acc, p) => acc + Number(p.amount), 0);

    // New users this month
    const thisMonth = startOfMonth(new Date());
    const newUsersThisMonth = subscriptions.filter(s => 
      new Date(s.created_at) >= thisMonth
    ).length;

    return {
      totalUsers: subscriptions.length,
      activeUsers: activeSubscriptions.length,
      mrr,
      churnRate,
      totalRevenue,
      newUsersThisMonth
    };
  }, [subscriptions, payments]);

  // Process revenue by month for chart
  const revenueByMonth = useMemo(() => {
    if (!payments) return [];

    const months = eachMonthOfInterval({
      start: subMonths(new Date(), parseInt(period) - 1),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = startOfMonth(subMonths(month, -1));
      
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.paid_at || p.created_at);
        return paymentDate >= monthStart && paymentDate < monthEnd && p.status === 'paid';
      });

      const revenue = monthPayments.reduce((acc, p) => acc + Number(p.amount), 0);

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        receita: revenue,
        pagamentos: monthPayments.length
      };
    });
  }, [payments, period]);

  // Process user growth by month
  const userGrowth = useMemo(() => {
    if (!subscriptions) return [];

    const months = eachMonthOfInterval({
      start: subMonths(new Date(), parseInt(period) - 1),
      end: new Date()
    });

    let cumulativeUsers = 0;
    let cumulativeCanceled = 0;

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = startOfMonth(subMonths(month, -1));
      
      const newUsers = subscriptions.filter(s => {
        const createdDate = new Date(s.created_at);
        return createdDate >= monthStart && createdDate < monthEnd;
      }).length;

      const canceledUsers = subscriptions.filter(s => {
        if (!s.canceled_at) return false;
        const canceledDate = new Date(s.canceled_at);
        return canceledDate >= monthStart && canceledDate < monthEnd;
      }).length;

      cumulativeUsers += newUsers;
      cumulativeCanceled += canceledUsers;

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        novos: newUsers,
        cancelados: canceledUsers,
        ativos: cumulativeUsers - cumulativeCanceled
      };
    });
  }, [subscriptions, period]);

  // Churn by month
  const churnByMonth = useMemo(() => {
    if (!subscriptions) return [];

    const months = eachMonthOfInterval({
      start: subMonths(new Date(), parseInt(period) - 1),
      end: new Date()
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = startOfMonth(subMonths(month, -1));
      
      const activeAtStart = subscriptions.filter(s => {
        const createdDate = new Date(s.created_at);
        return createdDate < monthStart && 
          (!s.canceled_at || new Date(s.canceled_at) >= monthStart);
      }).length;

      const canceledInMonth = subscriptions.filter(s => {
        if (!s.canceled_at) return false;
        const canceledDate = new Date(s.canceled_at);
        return canceledDate >= monthStart && canceledDate < monthEnd;
      }).length;

      const churnRate = activeAtStart > 0 
        ? (canceledInMonth / activeAtStart) * 100 
        : 0;

      return {
        month: format(month, 'MMM/yy', { locale: ptBR }),
        churn: Math.round(churnRate * 10) / 10
      };
    });
  }, [subscriptions, period]);

  const isLoading = loadingSubscriptions || loadingPayments;

  if (isLoading) {
    return (
      <RoleGuard requiredRole="adminsaas">
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
        </div>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard requiredRole="adminsaas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Métricas SaaS</h1>
            <p className="text-muted-foreground">
              Acompanhe receita, churn e crescimento de usuários
            </p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-44">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                R$ {metrics?.mrr?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Receita mensal recorrente
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {metrics?.activeUsers || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                de {metrics?.totalUsers || 0} total
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
              <UserMinus className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {metrics?.churnRate?.toFixed(1) || '0'}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                cancelamentos total
              </p>
            </CardContent>
          </Card>

          <Card className="gradient-card">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Novos Este Mês</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                +{metrics?.newUsersThisMonth || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                novos assinantes
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Receita Mensal
              </CardTitle>
              <CardDescription>
                Faturamento e número de pagamentos por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueByMonth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <YAxis 
                    yAxisId="right" 
                    orientation="right"
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'receita' 
                        ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
                        : value,
                      name === 'receita' ? 'Receita' : 'Pagamentos'
                    ]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar yAxisId="left" dataKey="receita" fill="hsl(var(--primary))" name="Receita" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="pagamentos" fill="hsl(var(--muted-foreground))" name="Pagamentos" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* User Growth Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Crescimento de Usuários
              </CardTitle>
              <CardDescription>
                Novos usuários, cancelamentos e base ativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="ativos" 
                    stackId="1"
                    stroke="#3b82f6" 
                    fill="#3b82f6" 
                    fillOpacity={0.3}
                    name="Usuários Ativos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="novos" 
                    stroke="#22c55e" 
                    strokeWidth={2}
                    name="Novos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="cancelados" 
                    stroke="#ef4444" 
                    strokeWidth={2}
                    name="Cancelados"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Churn Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Taxa de Churn por Mês
            </CardTitle>
            <CardDescription>
              Percentual de cancelamentos em relação à base ativa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={churnByMonth}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  formatter={(value: number) => [`${value}%`, 'Taxa de Churn']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="churn" 
                  stroke="#ef4444" 
                  strokeWidth={3}
                  dot={{ fill: '#ef4444', strokeWidth: 2 }}
                  name="Churn %"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Receita Total no Período</p>
                <p className="text-4xl font-bold text-green-600 mt-2">
                  R$ {metrics?.totalRevenue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </p>
                <p className="text-sm text-green-600/80 mt-1">
                  Últimos {period} meses
                </p>
              </div>
              <div className="rounded-full bg-green-500/10 p-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
