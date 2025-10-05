import { useEffect, useState } from 'react';
import { TrendingUp, Mail, GitBranch, Clock, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { dashboardService, alertService } from '@/services/api';
import type { DashboardKPIs, Alert as AlertType } from '@/types';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alerts, setAlerts] = useState<AlertType[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [kpisData, alertsData] = await Promise.all([
          dashboardService.getKPIs(),
          alertService.list({ unreadOnly: true })
        ]);
        setKpis(kpisData);
        setAlerts(alertsData);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 w-24 bg-muted rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-muted rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const alertTypeLabels: Record<string, string> = {
    new_email: 'Novo email detectado',
    new_funnel: 'Novo funil identificado',
    competitor_paused: 'Concorrente pausado',
    ab_test_detected: 'Teste A/B detectado'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Visão geral do monitoramento
          </p>
        </div>
        <Button onClick={() => navigate('/reports/new')}>
          <FileText className="h-4 w-4 mr-2" />
          Gerar Relatório
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Concorrentes Monitorados
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.competitorsMonitored}</div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Novos E-mails (7d)
            </CardTitle>
            <Mail className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.newEmailsLast7d}</div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Funis Detectados
            </CardTitle>
            <GitBranch className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.funnelsDetected}</div>
          </CardContent>
        </Card>

        <Card className="gradient-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Média de Intervalo
            </CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis?.avgIntervalHours}h</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum alerta novo no momento
            </p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map(alert => (
                <Alert key={alert.id}>
                  <AlertDescription className="flex items-center justify-between">
                    <span className="text-sm">
                      {alertTypeLabels[alert.type] || alert.type}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Empty state hint */}
      {kpis && kpis.competitorsMonitored === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Comece adicionando concorrentes
            </h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">
              Adicione seus concorrentes e conecte seu e-mail seed para começar a monitorar campanhas de email marketing.
            </p>
            <Button onClick={() => navigate('/onboarding')}>
              Iniciar Configuração
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
