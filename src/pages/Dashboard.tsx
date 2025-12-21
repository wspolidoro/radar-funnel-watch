import { useState } from 'react';
import { TrendingUp, FileText, Inbox, BarChart3, PieChart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_COLORS: Record<string, string> = {
  onboarding: '#3b82f6',
  educacao: '#22c55e',
  promo: '#ef4444',
  reengajamento: '#f97316',
  sazonal: '#a855f7',
  newsletter: '#06b6d4',
  transacional: '#6b7280',
  outros: '#64748b',
};

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: 'Onboarding',
  educacao: 'Educacional',
  promo: 'Promocional',
  reengajamento: 'Reengajamento',
  sazonal: 'Sazonal',
  newsletter: 'Newsletter',
  transacional: 'Transacional',
  outros: 'Outros',
};

const Dashboard = () => {
  const [periodDays, setPeriodDays] = useState<string>('30');
  const navigate = useNavigate();

  // Query for senders count
  const { data: sendersCount = 0 } = useQuery({
    queryKey: ['senders-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('email_aliases')
        .select('*', { count: 'exact', head: true });
      
      if (error) throw error;
      return count || 0;
    },
  });

  // Query for data leak alerts
  const { data: alerts = [] } = useQuery({
    queryKey: ['data-leak-alerts-unread'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('data_leak_alerts')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Query for newsletter stats
  const { data: newsletterStats } = useQuery({
    queryKey: ['newsletter-stats', periodDays],
    queryFn: async () => {
      const startDate = subDays(new Date(), parseInt(periodDays));
      
      const { data, error } = await supabase
        .from('captured_newsletters')
        .select('id, category, received_at, is_processed')
        .gte('received_at', startDate.toISOString());
      
      if (error) throw error;
      return data || [];
    },
  });

  // Process data for charts
  const categoryData = newsletterStats?.reduce((acc, newsletter) => {
    const cat = newsletter.category || 'outros';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const pieChartData = Object.entries(categoryData).map(([name, value]) => ({
    name: CATEGORY_LABELS[name] || name,
    value,
    color: CATEGORY_COLORS[name] || '#64748b',
  }));

  // Process daily data for line chart
  const days = parseInt(periodDays);
  const dateRange = eachDayOfInterval({
    start: subDays(new Date(), days - 1),
    end: new Date(),
  });

  const dailyData = dateRange.map(date => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const count = newsletterStats?.filter(n => {
      const receivedDate = new Date(n.received_at);
      return receivedDate >= dayStart && receivedDate < dayEnd;
    }).length || 0;

    return {
      date: format(date, 'dd/MM', { locale: ptBR }),
      newsletters: count,
    };
  });

  // Process category by day for stacked bar chart
  const categoryByDayData = dateRange.map(date => {
    const dayStart = startOfDay(date);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    
    const dayNewsletters = newsletterStats?.filter(n => {
      const receivedDate = new Date(n.received_at);
      return receivedDate >= dayStart && receivedDate < dayEnd;
    }) || [];

    const result: Record<string, any> = {
      date: format(date, 'dd/MM', { locale: ptBR }),
    };

    Object.keys(CATEGORY_LABELS).forEach(cat => {
      result[cat] = dayNewsletters.filter(n => (n.category || 'outros') === cat).length;
    });

    return result;
  });

  const totalNewsletters = newsletterStats?.length || 0;
  const categorizedNewsletters = newsletterStats?.filter(n => n.category).length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do monitoramento
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodDays} onValueChange={setPeriodDays}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="14">Últimos 14 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => navigate('/reports/new')}>
            <FileText className="h-4 w-4 mr-2" />
            Gerar Relatório
          </Button>
        </div>
      </div>

      {/* Newsletter KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Newsletters Capturadas
            </CardTitle>
            <Inbox className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalNewsletters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              nos últimos {periodDays} dias
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Categorizadas
            </CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{categorizedNewsletters}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {totalNewsletters > 0 ? Math.round((categorizedNewsletters / totalNewsletters) * 100) : 0}% do total
            </p>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Remetentes Monitorados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{sendersCount}</div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Média por Dia
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {totalNewsletters > 0 ? (totalNewsletters / parseInt(periodDays)).toFixed(1) : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              newsletters/dia
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribuição por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RechartsPie>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPie>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Tendência Diária
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="newsletters" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))' }}
                    name="Newsletters"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhum dado disponível
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Stacked Bar Chart by Category */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Newsletters por Categoria e Dia
          </CardTitle>
        </CardHeader>
        <CardContent>
          {categoryByDayData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={categoryByDayData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                  <Bar 
                    key={key}
                    dataKey={key} 
                    stackId="a" 
                    fill={CATEGORY_COLORS[key]} 
                    name={label}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              Nenhum dado disponível
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alerts Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Vazamento de Dados</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum alerta de vazamento no momento
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <Alert key={alert.id}>
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">
                      Email de <strong>{alert.from_email}</strong> recebido de domínio inesperado
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state hint */}
      {totalNewsletters === 0 && sendersCount === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Comece adicionando remetentes
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Adicione remetentes e conecte seu e-mail seed para começar a monitorar campanhas de email marketing.
            </p>
            <Button onClick={() => navigate('/senders')}>
              Adicionar Remetentes
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;