import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  Search, 
  Download, 
  Eye,
  Play,
  Pause,
  FileText,
  TrendingUp,
  Mail,
  GitBranch,
  Calendar,
  Lightbulb,
  X,
  BarChart3,
  Clock
} from 'lucide-react';
import { competitorService, subscriptionService, funnelService } from '@/services/api';
import type { Sender } from '@/types';
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { SenderCard } from '@/components/SenderCard';
import { SparklineChart } from '@/components/SparklineChart';
import { Separator } from '@/components/ui/separator';
import { useNavigate } from 'react-router-dom';
import { NewSenderForm } from '@/components/NewSenderForm';

const statusColors = {
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  paused: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  error: 'bg-red-500/10 text-red-700 border-red-500/20'
};

const statusLabels = {
  active: 'Ativo',
  paused: 'Pausado',
  error: 'Erro'
};

export default function Senders() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [showNewActivity, setShowNewActivity] = useState(false);
  const [selectedSender, setSelectedSender] = useState<Sender | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [isNewSenderOpen, setIsNewSenderOpen] = useState(false);

  const { data: competitorsData, isLoading } = useQuery({
    queryKey: ['competitors', search],
    queryFn: () => competitorService.list({ search })
  });

  const { data: subscriptionsData } = useQuery({
    queryKey: ['subscriptions', selectedSender?.id],
    queryFn: () => selectedSender ? subscriptionService.list(selectedSender.id) : Promise.resolve([]),
    enabled: !!selectedSender
  });

  const { data: funnelsData } = useQuery({
    queryKey: ['funnels', selectedSender?.id],
    queryFn: () => selectedSender ? funnelService.list({ competitorId: selectedSender.id }) : Promise.resolve([]),
    enabled: !!selectedSender
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'paused' }) => {
      return competitorService.update(id, { 
        status: status === 'active' ? 'paused' : 'active' 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['competitors'] });
      toast({
        title: 'Status atualizado',
        description: 'O status do concorrente foi alterado com sucesso.'
      });
    }
  });

  const exportMutation = useMutation({
    mutationFn: async () => {
      // Mock CSV export
      const csv = 'Nome,Domínio,Status,E-mails 30d,Funis Ativos\n' +
        (competitorsData || []).map(c => 
          `${c.name},${c.mainDomain},${statusLabels[c.status]},${c.emailsLast30d},${c.activeFunnels}`
        ).join('\n');
      return csv;
    },
    onSuccess: (csv) => {
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `concorrentes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast({
        title: 'Exportação concluída',
        description: 'O arquivo CSV foi gerado com sucesso.'
      });
    }
  });

  const filteredCompetitors = useMemo(() => {
    if (!competitorsData) return [];
    
    let filtered = [...competitorsData];
    
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }
    
    if (showNewActivity) {
      filtered = filtered.filter(c => c.hasNewActivity);
    }
    
    return filtered;
  }, [competitorsData, statusFilter, showNewActivity]);

  const topCompetitors = useMemo(() => {
    return [...filteredCompetitors]
      .sort((a, b) => b.emailsLast30d - a.emailsLast30d)
      .slice(0, 3);
  }, [filteredCompetitors]);

  const handleViewDetails = (sender: Sender) => {
    setSelectedSender(sender);
    setIsDetailsOpen(true);
  };

  const handleToggleComparison = (competitorId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(competitorId)) {
        return prev.filter(id => id !== competitorId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Limite atingido',
          description: 'Você pode comparar no máximo 3 concorrentes.',
          variant: 'destructive'
        });
        return prev;
      }
      return [...prev, competitorId];
    });
  };

  const handleCompare = () => {
    if (selectedForComparison.length < 2) {
      toast({
        title: 'Seleção insuficiente',
        description: 'Selecione pelo menos 2 concorrentes para comparar.',
        variant: 'destructive'
      });
      return;
    }
    setIsComparisonOpen(true);
  };

  const comparisonCompetitors = useMemo(() => {
    return filteredCompetitors.filter(c => selectedForComparison.includes(c.id));
  }, [filteredCompetitors, selectedForComparison]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Concorrentes</h1>
          <p className="text-muted-foreground">
            Monitore e analise seus concorrentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportMutation.mutate()}>
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setIsNewSenderOpen(true)}>
            <Plus className="h-4 w-4" />
            Novo Remetente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar concorrente por nome ou domínio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="paused">Pausados</SelectItem>
                <SelectItem value="error">Com Erro</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="new-activity"
                checked={showNewActivity}
                onCheckedChange={(checked) => setShowNewActivity(checked as boolean)}
              />
              <label
                htmlFor="new-activity"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Com novidades (24h)
              </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Bar */}
      {selectedForComparison.length > 0 && (
        <Card className="border-primary">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {selectedForComparison.length} concorrente{selectedForComparison.length > 1 ? 's' : ''} selecionado{selectedForComparison.length > 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedForComparison([])}
                >
                  Limpar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCompare}
                  disabled={selectedForComparison.length < 2}
                >
                  Comparar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        </div>
      ) : filteredCompetitors.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="rounded-full bg-muted p-6 mb-4">
              <TrendingUp className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              Nenhum concorrente encontrado
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              {search || statusFilter !== 'todos' || showNewActivity
                ? 'Tente ajustar os filtros de busca.'
                : 'Nenhum concorrente cadastrado. Clique em "Novo Concorrente" para começar.'}
            </p>
            {!search && statusFilter === 'todos' && !showNewActivity && (
              <Button onClick={() => setIsNewSenderOpen(true)}>
                <Plus className="h-4 w-4" />
                Novo Remetente
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Top Competitors Cards */}
          {topCompetitors.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Mais Ativos
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {topCompetitors.map((sender) => (
                  <SenderCard
                    key={sender.id}
                    sender={sender}
                    onViewDetails={handleViewDetails}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Full Table */}
          <Card>
            <CardHeader>
              <CardTitle>Todos os Concorrentes</CardTitle>
              <CardDescription>
                {filteredCompetitors.length} concorrente{filteredCompetitors.length !== 1 ? 's' : ''} encontrado{filteredCompetitors.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Concorrente</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Funis</TableHead>
                    <TableHead className="text-right">E-mails 30d</TableHead>
                    <TableHead>Último envio</TableHead>
                    <TableHead className="text-right">Intervalo (h)</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompetitors.map((competitor) => (
                    <TableRow key={competitor.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedForComparison.includes(competitor.id)}
                          onCheckedChange={() => handleToggleComparison(competitor.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{competitor.name}</span>
                            {competitor.hasNewActivity && (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/20 text-xs">
                                Novo
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {competitor.mainDomain}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[competitor.status]}>
                          {statusLabels[competitor.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{competitor.activeFunnels}</TableCell>
                      <TableCell className="text-right">{competitor.emailsLast30d}</TableCell>
                      <TableCell className="text-sm">
                        {formatDate(competitor.lastEmailAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        {competitor.avgIntervalHours || 0}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(competitor)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatusMutation.mutate({
                              id: competitor.id,
                              status: competitor.status as 'active' | 'paused'
                            })}
                          >
                            {competitor.status === 'active' ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}

      {/* Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedCompetitor && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {selectedCompetitor.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <SheetTitle className="text-2xl">{selectedCompetitor.name}</SheetTitle>
                    <SheetDescription>{selectedCompetitor.mainDomain}</SheetDescription>
                  </div>
                  <Badge variant="outline" className={statusColors[selectedCompetitor.status]}>
                    {statusLabels[selectedCompetitor.status]}
                  </Badge>
                </div>
              </SheetHeader>

              <Tabs defaultValue="resumo" className="mt-6">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="funis">Funis</TabsTrigger>
                  <TabsTrigger value="seeds">Seeds</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-mails (30 dias)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{selectedCompetitor.emailsLast30d}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <GitBranch className="h-4 w-4" />
                          Funis Ativos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{selectedCompetitor.activeFunnels}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Intervalo Médio
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{selectedCompetitor.avgIntervalHours || 0}h</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Último Envio
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-lg font-medium">
                          {formatDate(selectedCompetitor.lastEmailAt)}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedCompetitor.sparklineData && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Atividade dos últimos 30 dias</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <SparklineChart data={selectedCompetitor.sparklineData} className="h-16" />
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4" />
                      Exportar E-mails
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Plus className="h-4 w-4" />
                      Nova Inscrição
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="funis" className="space-y-4">
                  {funnelsData && funnelsData.length > 0 ? (
                    funnelsData.map((funnel) => (
                      <Card key={funnel.id}>
                        <CardHeader>
                          <CardTitle className="text-base">{funnel.name}</CardTitle>
                          <CardDescription>
                            {funnel.emailIds.length} e-mails • Gap médio: {funnel.cadenceSummary.avgGap}h
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {new Date(funnel.startDate).toLocaleDateString('pt-BR')}
                              {funnel.endDate && ` - ${new Date(funnel.endDate).toLocaleDateString('pt-BR')}`}
                            </span>
                            <Button variant="ghost" size="sm">
                              Ver funil completo
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum funil detectado ainda
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="seeds" className="space-y-4">
                  {subscriptionsData && subscriptionsData.length > 0 ? (
                    subscriptionsData.map((subscription) => (
                      <Card key={subscription.id}>
                        <CardHeader>
                          <CardTitle className="text-sm">Seed: {subscription.seedId}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <div>
                            <span className="text-sm font-medium">URL de Captura:</span>
                            <p className="text-sm text-muted-foreground break-all">
                              {subscription.captureUrl}
                            </p>
                          </div>
                          {subscription.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {subscription.labels.map((label, i) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                  {label}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma inscrição configurada
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="insights" className="space-y-4">
                  {selectedCompetitor.insights && selectedCompetitor.insights.length > 0 ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lightbulb className="h-5 w-5 text-yellow-500" />
                          Insights IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {selectedCompetitor.insights.map((insight, i) => (
                            <li key={i} className="flex gap-3">
                              <span className="text-primary font-bold">•</span>
                              <span className="text-sm">{insight}</span>
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum insight disponível ainda
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Comparison Dialog */}
      <Sheet open={isComparisonOpen} onOpenChange={setIsComparisonOpen}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>Comparação de Concorrentes</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsComparisonOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
            <SheetDescription>
              Comparando {comparisonCompetitors.length} concorrentes
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Comparison Grid */}
            <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonCompetitors.length}, 1fr)` }}>
              {comparisonCompetitors.map((competitor) => (
                <Card key={competitor.id}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{competitor.name}</CardTitle>
                    <CardDescription className="text-xs">{competitor.mainDomain}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">E-mails 30d</p>
                      <p className="text-2xl font-bold">{competitor.emailsLast30d}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Funis Ativos</p>
                      <p className="text-2xl font-bold">{competitor.activeFunnels}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Intervalo Médio</p>
                      <p className="text-2xl font-bold">{competitor.avgIntervalHours || 0}h</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge variant="outline" className={statusColors[competitor.status]}>
                        {statusLabels[competitor.status]}
                      </Badge>
                    </div>
                    {competitor.sparklineData && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">Atividade</p>
                        <SparklineChart data={competitor.sparklineData} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <Separator />

            {/* Insights Comparison */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Insights Comparativos</h3>
              <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${comparisonCompetitors.length}, 1fr)` }}>
                {comparisonCompetitors.map((competitor) => (
                  <Card key={`insights-${competitor.id}`}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{competitor.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {competitor.insights && competitor.insights.length > 0 ? (
                        <ul className="space-y-2">
                          {competitor.insights.slice(0, 3).map((insight, i) => (
                            <li key={i} className="text-xs flex gap-2">
                              <span className="text-primary">•</span>
                              <span>{insight}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem insights</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* New Competitor Sheet */}
      <Sheet open={isNewSenderOpen} onOpenChange={setIsNewSenderOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Novo Remetente</SheetTitle>
            <SheetDescription>
              Preencha os dados para iniciar o monitoramento de um novo remetente
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            <NewSenderForm 
              onSubmit={(data) => {
                toast({
                  title: 'Remetente cadastrado!',
                  description: `${data.name} foi adicionado com sucesso.`,
                });
                setIsNewSenderOpen(false);
                queryClient.invalidateQueries({ queryKey: ['competitors'] });
              }}
              onCancel={() => setIsNewSenderOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
