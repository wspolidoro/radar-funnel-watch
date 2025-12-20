import { useQuery } from '@tanstack/react-query';
import { 
  Users, 
  CreditCard, 
  AlertTriangle, 
  TrendingUp,
  Activity
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: async () => {
      const [profilesRes, subscriptionsRes, paymentsRes, alertsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('saas_subscriptions').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        supabase.from('saas_payments').select('amount').eq('status', 'paid'),
        supabase.from('data_leak_alerts').select('id', { count: 'exact', head: true }).eq('is_read', false)
      ]);

      const totalRevenue = paymentsRes.data?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      return {
        totalUsers: profilesRes.count || 0,
        activeSubscriptions: subscriptionsRes.count || 0,
        totalRevenue,
        pendingAlerts: alertsRes.count || 0
      };
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Activity className="h-8 w-8" />
          Dashboard SaaS
        </h1>
        <p className="text-muted-foreground mt-1">
          Visão geral da plataforma RadarMail
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total de Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers}</div>
            <p className="text-xs text-muted-foreground">Usuários cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
              <TrendingUp className="h-4 w-4" />
              Assinaturas Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats?.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Clientes pagantes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-600">
              <CreditCard className="h-4 w-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {stats?.totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">Pagamentos confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Alertas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.pendingAlerts}</div>
            <p className="text-xs text-muted-foreground">Aguardando revisão</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
            <CardDescription>Links para áreas importantes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <a href="/admin/clients" className="block p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="font-medium">Gerenciar Clientes</div>
              <div className="text-sm text-muted-foreground">Ver e editar informações de clientes</div>
            </a>
            <a href="/admin/alerts" className="block p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="font-medium">Verificar Alertas</div>
              <div className="text-sm text-muted-foreground">Revisar alertas de vazamento</div>
            </a>
            <a href="/admin/payments" className="block p-3 rounded-lg border hover:bg-muted transition-colors">
              <div className="font-medium">Pagamentos</div>
              <div className="text-sm text-muted-foreground">Histórico de pagamentos</div>
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Status da Plataforma</CardTitle>
            <CardDescription>Indicadores de saúde</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm">API</span>
              <span className="flex items-center gap-2 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
                Operacional
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Banco de Dados</span>
              <span className="flex items-center gap-2 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
                Operacional
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Edge Functions</span>
              <span className="flex items-center gap-2 text-green-600">
                <div className="h-2 w-2 rounded-full bg-green-600"></div>
                Operacional
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
