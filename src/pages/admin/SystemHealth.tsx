import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Globe,
  Mail,
  Clock,
  RefreshCw,
  Loader2,
  Wifi,
  Server,
  TrendingUp
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DomainHealth {
  id: string;
  domain: string;
  provider: string;
  is_active: boolean | null;
  dns_status: string | null;
  dns_verified_at: string | null;
}

interface HealthStats {
  totalDomains: number;
  activeDomains: number;
  dnsVerified: number;
  dnsFailed: number;
  dnsPending: number;
  healthScore: number;
}

export default function SystemHealth() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch domains health
  const { data: domains, isLoading: domainsLoading, refetch: refetchDomains } = useQuery({
    queryKey: ['domains-health'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('id, domain, provider, is_active, dns_status, dns_verified_at')
        .eq('is_platform_domain', true)
        .order('domain');

      if (error) throw error;
      return data as DomainHealth[];
    },
  });

  // Fetch recent email logs stats
  const { data: emailStats, isLoading: emailStatsLoading } = useQuery({
    queryKey: ['email-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_logs')
        .select('status, received_at')
        .gte('received_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      return {
        total: data?.length || 0,
        processed: data?.filter(e => e.status === 'processed').length || 0,
        errors: data?.filter(e => e.status === 'error').length || 0,
      };
    },
  });

  // Fetch connectivity test stats
  const { data: testStats, isLoading: testStatsLoading } = useQuery({
    queryKey: ['connectivity-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connectivity_tests')
        .select('status, latency_ms')
        .gte('sent_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;
      
      const successful = data?.filter(t => t.status === 'success') || [];
      const avgLatency = successful.length 
        ? Math.round(successful.reduce((acc, t) => acc + (t.latency_ms || 0), 0) / successful.length)
        : 0;

      return {
        total: data?.length || 0,
        successful: successful.length,
        failed: data?.filter(t => t.status === 'failed').length || 0,
        avgLatency,
      };
    },
  });

  // Calculate health stats
  const healthStats: HealthStats = {
    totalDomains: domains?.length || 0,
    activeDomains: domains?.filter(d => d.is_active).length || 0,
    dnsVerified: domains?.filter(d => d.dns_status === 'verified').length || 0,
    dnsFailed: domains?.filter(d => d.dns_status && d.dns_status !== 'verified' && d.dns_status !== 'pending').length || 0,
    dnsPending: domains?.filter(d => !d.dns_status || d.dns_status === 'pending').length || 0,
    healthScore: 0,
  };

  // Calculate health score (0-100)
  if (healthStats.totalDomains > 0) {
    const dnsScore = (healthStats.dnsVerified / healthStats.totalDomains) * 50;
    const activeScore = (healthStats.activeDomains / healthStats.totalDomains) * 30;
    const emailScore = emailStats?.total 
      ? ((emailStats.processed / emailStats.total) * 20)
      : 20;
    healthStats.healthScore = Math.round(dnsScore + activeScore + emailScore);
  }

  const refreshAll = async () => {
    setIsRefreshing(true);
    try {
      const { error } = await supabase.functions.invoke('verify-dns-cron');
      if (error) throw error;
      
      toast({
        title: 'Verificação concluída',
        description: 'Status de todos os domínios atualizado.',
      });
      
      refetchDomains();
    } catch (error) {
      toast({
        title: 'Erro na verificação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    return 'text-destructive';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-destructive';
  };

  const getDnsStatusIcon = (status: string | null) => {
    switch (status) {
      case 'verified':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'incorrect':
      case 'no_records':
      case 'dns_error':
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const isLoading = domainsLoading || emailStatsLoading || testStatsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            Saúde do Sistema
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento consolidado de domínios e emails
          </p>
        </div>
        <Button onClick={refreshAll} disabled={isRefreshing} className="gap-2">
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Verificar Todos
        </Button>
      </div>

      {/* Health Score Card */}
      <Card className="border-2">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Score de Saúde</span>
            <span className={`text-4xl font-bold ${getHealthColor(healthStats.healthScore)}`}>
              {isLoading ? '-' : healthStats.healthScore}%
            </span>
          </CardTitle>
          <CardDescription>
            Índice geral de funcionamento do sistema de emails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Progress 
            value={healthStats.healthScore} 
            className={`h-3 ${getHealthBg(healthStats.healthScore)}`}
          />
          <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
            <div className="text-center">
              <div className="font-medium">DNS Verificados</div>
              <div className="text-2xl font-bold text-green-500">
                {healthStats.dnsVerified}/{healthStats.totalDomains}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Emails 24h</div>
              <div className="text-2xl font-bold text-blue-500">
                {emailStats?.total || 0}
              </div>
            </div>
            <div className="text-center">
              <div className="font-medium">Taxa de Sucesso</div>
              <div className="text-2xl font-bold text-green-500">
                {emailStats?.total 
                  ? Math.round((emailStats.processed / emailStats.total) * 100) 
                  : 100}%
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Domínios Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold">{healthStats.activeDomains}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              DNS OK
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-green-500">{healthStats.dnsVerified}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              DNS Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-amber-500">{healthStats.dnsPending}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="h-4 w-4 text-destructive" />
              DNS Falhou
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-3xl font-bold text-destructive">{healthStats.dnsFailed}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Email & Connectivity Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Emails (últimas 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailStatsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">Total</div>
                  <div className="text-2xl font-bold">{emailStats?.total || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Processados</div>
                  <div className="text-2xl font-bold text-green-500">{emailStats?.processed || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Erros</div>
                  <div className="text-2xl font-bold text-destructive">{emailStats?.errors || 0}</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Testes de Conectividade (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {testStatsLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-sm text-muted-foreground">Executados</div>
                  <div className="text-2xl font-bold">{testStats?.total || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Sucesso</div>
                  <div className="text-2xl font-bold text-green-500">{testStats?.successful || 0}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Latência Média</div>
                  <div className="text-2xl font-bold text-blue-500">{testStats?.avgLatency || 0}ms</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Domains Status List */}
      <Card>
        <CardHeader>
          <CardTitle>Status dos Domínios</CardTitle>
          <CardDescription>
            Visão detalhada de cada domínio da plataforma
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : domains?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum domínio configurado
            </div>
          ) : (
            <div className="space-y-3">
              {domains?.map(domain => (
                <div 
                  key={domain.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getDnsStatusIcon(domain.dns_status)}
                    <div>
                      <div className="font-medium">{domain.domain}</div>
                      <div className="text-xs text-muted-foreground flex items-center gap-2">
                        <Server className="h-3 w-3" />
                        {domain.provider}
                        {domain.dns_verified_at && (
                          <>
                            <span>•</span>
                            <span>
                              Verificado {formatDistanceToNow(new Date(domain.dns_verified_at), { 
                                addSuffix: true, 
                                locale: ptBR 
                              })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.is_active ? (
                      <Badge className="bg-green-500">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                    <Badge variant={domain.dns_status === 'verified' ? 'default' : 'outline'}>
                      {domain.dns_status || 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
