import { useEffect, useState } from 'react';
import { GitBranch, Eye, Download, GitCompare, Mail, Clock, TrendingUp, Filter, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { EmailCategoryBadge } from '@/components/EmailCategoryBadge';
import { EmailThumbnail } from '@/components/EmailThumbnail';
import { EmailViewer } from '@/components/EmailViewer';
import { funnelService, competitorService } from '@/services/api';
import { mockEmails } from '@/services/mockData';
import type { Funnel, Competitor, Email } from '@/types';
import { useToast } from '@/hooks/use-toast';

const Funnels = () => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [selectedForComparison, setSelectedForComparison] = useState<string[]>([]);
  const [comparingFunnels, setComparingFunnels] = useState<Funnel[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [filters, setFilters] = useState({
    competitorId: 'all',
    category: 'all',
    period: '30d'
  });
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [funnelsData, competitorsData] = await Promise.all([
        funnelService.list(filters),
        competitorService.list()
      ]);
      setFunnels(funnelsData);
      setCompetitors(competitorsData);
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (selectedForComparison.length < 2) {
      toast({
        title: 'Selecione pelo menos 2 funis',
        description: 'Você precisa selecionar 2 ou 3 funis para comparar.',
        variant: 'destructive'
      });
      return;
    }
    
    const compared = await funnelService.compare(selectedForComparison);
    setComparingFunnels(compared);
    setShowComparison(true);
  };

  const handleExport = async () => {
    await funnelService.exportCSV(filters);
    toast({
      title: 'Exportando funis',
      description: 'O download do CSV começará em breve.'
    });
  };

  const toggleSelection = (funnelId: string) => {
    setSelectedForComparison(prev => {
      if (prev.includes(funnelId)) {
        return prev.filter(id => id !== funnelId);
      }
      if (prev.length >= 3) {
        toast({
          title: 'Limite atingido',
          description: 'Você pode comparar no máximo 3 funis.',
          variant: 'destructive'
        });
        return prev;
      }
      return [...prev, funnelId];
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return days;
  };

  const getCompetitorName = (competitorId: string) => {
    return competitors.find(c => c.id === competitorId)?.name || 'Desconhecido';
  };

  // Calculate metrics
  const metrics = {
    total: funnels.length,
    newLast30d: funnels.filter(f => {
      const start = new Date(f.startDate);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return start >= thirtyDaysAgo;
    }).length,
    longest: Math.max(...funnels.map(f => f.emails.length), 0),
    avgInterval: funnels.length > 0 
      ? Math.round(funnels.reduce((sum, f) => sum + f.cadenceSummary.avgGap, 0) / funnels.length) 
      : 0,
    mostActive: competitors.reduce((acc, comp) => {
      const count = funnels.filter(f => f.competitorId === comp.id).length;
      return count > acc.count ? { name: comp.name, count } : acc;
    }, { name: '', count: 0 })
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Funis de E-mails</h1>
          <p className="text-muted-foreground mt-1">
            Sequências detectadas automaticamente de concorrentes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          {selectedForComparison.length >= 2 && (
            <Button onClick={handleCompare}>
              <GitCompare className="h-4 w-4 mr-2" />
              Comparar ({selectedForComparison.length})
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Concorrente</label>
              <Select
                value={filters.competitorId}
                onValueChange={(value) => setFilters({ ...filters, competitorId: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {competitors.map(comp => (
                    <SelectItem key={comp.id} value={comp.id}>
                      {comp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Categoria</label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ ...filters, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="onboarding">Onboarding</SelectItem>
                  <SelectItem value="promo">Promoção</SelectItem>
                  <SelectItem value="educacao">Educação</SelectItem>
                  <SelectItem value="reengajamento">Reengajamento</SelectItem>
                  <SelectItem value="sazonal">Sazonal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Período</label>
              <Select
                value={filters.period}
                onValueChange={(value) => setFilters({ ...filters, period: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="90d">Últimos 90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funis</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funis Novos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.newLast30d}</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funil Mais Longo</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.longest}</div>
            <p className="text-xs text-muted-foreground">E-mails</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intervalo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgInterval}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mais Ativo</CardTitle>
            <Filter className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold truncate">{metrics.mostActive.name || '-'}</div>
            <p className="text-xs text-muted-foreground">{metrics.mostActive.count} funis</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : funnels.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhum funil detectado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Nome do Funil</TableHead>
                <TableHead>Concorrente</TableHead>
                <TableHead className="text-right">Nº de E-mails</TableHead>
                <TableHead className="text-right">Duração (dias)</TableHead>
                <TableHead className="text-right">Intervalo Médio</TableHead>
                <TableHead>Último E-mail</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.map((funnel) => (
                <TableRow key={funnel.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedForComparison.includes(funnel.id)}
                      onCheckedChange={() => toggleSelection(funnel.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{funnel.name}</TableCell>
                  <TableCell>{getCompetitorName(funnel.competitorId)}</TableCell>
                  <TableCell className="text-right">{funnel.emails.length}</TableCell>
                  <TableCell className="text-right">
                    {getDuration(funnel.startDate, funnel.endDate)}
                  </TableCell>
                  <TableCell className="text-right">{funnel.cadenceSummary.avgGap}h</TableCell>
                  <TableCell>{formatDate(funnel.lastEmailAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFunnel(funnel)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Funnel Detail Sheet */}
      <Sheet open={!!selectedFunnel} onOpenChange={() => setSelectedFunnel(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedFunnel && (
            <>
              <SheetHeader>
                <SheetTitle>{selectedFunnel.name}</SheetTitle>
                <SheetDescription>
                  {getCompetitorName(selectedFunnel.competitorId)} • {selectedFunnel.emails.length} e-mails
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="flow" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="flow">Fluxograma</TabsTrigger>
                  <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>

                <TabsContent value="flow" className="space-y-6 mt-6">
                  {/* Grid de Miniaturas */}
                  <div>
                    <h4 className="text-sm font-semibold mb-4">Sequência de E-mails</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {selectedFunnel.emails.map((email) => {
                        const fullEmail = mockEmails.find(e => e.id === email.id);
                        const categoryColors = {
                          onboarding: 'border-blue-500/40 shadow-blue-500/20',
                          educacao: 'border-green-500/40 shadow-green-500/20',
                          promo: 'border-red-500/40 shadow-red-500/20',
                          reengajamento: 'border-orange-500/40 shadow-orange-500/20',
                          sazonal: 'border-purple-500/40 shadow-purple-500/20',
                        };
                        
                        return (
                          <div
                            key={email.id}
                            className={cn(
                              "relative group border-2 rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg",
                              categoryColors[email.category as keyof typeof categoryColors] || 'border-border'
                            )}
                          >
                            <div className="aspect-[3/4] relative bg-white">
                              <EmailThumbnail
                                htmlContent={fullEmail?.htmlContent}
                                subject={email.subject}
                                onClick={() => {
                                  if (fullEmail) {
                                    setViewingEmail(fullEmail);
                                  }
                                }}
                              />
                            </div>
                            
                            <div className="p-3 space-y-2 bg-card">
                              <div className="flex items-center justify-between gap-2">
                                <Badge variant="secondary" className="text-xs font-bold">
                                  D+{email.dayOffset ?? 0}
                                </Badge>
                                <EmailCategoryBadge category={email.category} />
                              </div>
                              
                              <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                                {email.subject}
                              </h4>
                              
                              {email.cta && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Target className="h-3 w-3 flex-shrink-0" />
                                  <span className="truncate">{email.cta}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Timeline View */}
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-semibold mb-4">Linha do Tempo Detalhada</h4>
                    <div className="space-y-3">
                      {selectedFunnel.emails.map((email, index) => {
                        const nextEmail = selectedFunnel.emails[index + 1];
                        const gap = nextEmail 
                          ? Math.round((new Date(nextEmail.sentAt).getTime() - new Date(email.sentAt).getTime()) / (1000 * 60 * 60))
                          : null;
                        
                        const fullEmail = mockEmails.find(e => e.id === email.id);
                        
                        const categoryColors = {
                          onboarding: 'from-blue-500/10 to-blue-600/10 border-blue-500/30',
                          educacao: 'from-green-500/10 to-green-600/10 border-green-500/30',
                          promo: 'from-red-500/10 to-red-600/10 border-red-500/30',
                          reengajamento: 'from-orange-500/10 to-orange-600/10 border-orange-500/30',
                          sazonal: 'from-purple-500/10 to-purple-600/10 border-purple-500/30'
                        };
                        
                        return (
                          <div key={email.id}>
                            <div className="flex gap-4">
                              {/* Email Thumbnail */}
                              <div className="w-48 flex-shrink-0">
                                <div className="aspect-[3/4] rounded-lg overflow-hidden border-2 hover:border-primary transition-colors cursor-pointer"
                                     onClick={() => {
                                       if (fullEmail) setViewingEmail(fullEmail);
                                     }}>
                                  <EmailThumbnail
                                    htmlContent={fullEmail?.htmlContent}
                                    subject={email.subject}
                                    onClick={() => {
                                      if (fullEmail) setViewingEmail(fullEmail);
                                    }}
                                  />
                                </div>
                              </div>
                              
                              {/* Email Details Card */}
                              <div className="flex-1">
                                <Card className={`bg-gradient-to-br ${categoryColors[email.category as keyof typeof categoryColors]} border-2 transition-all hover:shadow-lg h-full`}>
                                  <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="space-y-2 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <Badge variant="outline" className="font-bold">D+{email.dayOffset ?? 0}</Badge>
                                          <EmailCategoryBadge category={email.category} />
                                          {email.cta && (
                                            <Badge variant="secondary" className="text-xs">
                                              <Target className="h-3 w-3 mr-1" />
                                              CTA
                                            </Badge>
                                          )}
                                        </div>
                                        <p className="font-semibold text-base leading-tight">{email.subject}</p>
                                        {email.cta && (
                                          <div className="flex items-center gap-2 text-sm">
                                            <Target className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-muted-foreground font-medium">{email.cta}</span>
                                          </div>
                                        )}
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={() => {
                                          if (fullEmail) setViewingEmail(fullEmail);
                                        }}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="pt-0">
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(email.sentAt).toLocaleString('pt-BR')}
                                    </p>
                                  </CardContent>
                                </Card>
                              </div>
                            </div>
                            
                            {gap !== null && (
                              <div className="flex items-center justify-center py-3">
                                <Badge variant="outline" className="text-xs font-medium">
                                  +{gap}h
                                </Badge>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="stats" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Resumo de Cadência</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Gap Médio</p>
                          <p className="text-2xl font-bold">{selectedFunnel.cadenceSummary.avgGap}h</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mínimo</p>
                          <p className="text-2xl font-bold">{selectedFunnel.cadenceSummary.min}h</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Máximo</p>
                          <p className="text-2xl font-bold">{selectedFunnel.cadenceSummary.max}h</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Categorias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(
                          selectedFunnel.emails.reduce((acc, email) => {
                            acc[email.category] = (acc[email.category] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        ).map(([category, count]) => (
                          <div key={category} className="flex items-center justify-between">
                            <EmailCategoryBadge category={category as any} />
                            <span className="text-sm text-muted-foreground">{count} e-mails</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="insights" className="space-y-4 mt-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Insights de IA</CardTitle>
                      <SheetDescription>
                        Análises automáticas deste funil
                      </SheetDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {selectedFunnel.insights.map((insight, index) => (
                          <li key={index} className="flex gap-2">
                            <span className="text-primary">•</span>
                            <span className="text-sm">{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Comparison Sheet */}
      <Sheet open={showComparison} onOpenChange={setShowComparison}>
        <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Comparação de Funis</SheetTitle>
            <SheetDescription>
              Comparando {comparingFunnels.length} funis lado a lado
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Metrics Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Métricas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {comparingFunnels.map(funnel => (
                    <div key={funnel.id} className="space-y-3">
                      <p className="font-medium truncate">{funnel.name}</p>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">E-mails:</span>
                          <span className="font-medium">{funnel.emails.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Gap médio:</span>
                          <span className="font-medium">{funnel.cadenceSummary.avgGap}h</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Duração:</span>
                          <span className="font-medium">
                            {getDuration(funnel.startDate, funnel.endDate)} dias
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Categories Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Categorias Predominantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {comparingFunnels.map(funnel => {
                    const categories = funnel.emails.reduce((acc, email) => {
                      acc[email.category] = (acc[email.category] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>);
                    
                    return (
                      <div key={funnel.id} className="space-y-2">
                        <p className="font-medium truncate text-sm">{funnel.name}</p>
                        <div className="space-y-1">
                          {Object.entries(categories)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 3)
                            .map(([category, count]) => (
                              <div key={category} className="flex items-center gap-2">
                                <EmailCategoryBadge category={category as any} />
                                <span className="text-xs text-muted-foreground">({count})</span>
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Key Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Principais Insights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {comparingFunnels.map(funnel => (
                    <div key={funnel.id} className="space-y-2">
                      <p className="font-medium truncate text-sm">{funnel.name}</p>
                      <ul className="space-y-1">
                        {funnel.insights.slice(0, 3).map((insight, index) => (
                          <li key={index} className="text-xs text-muted-foreground flex gap-1">
                            <span>•</span>
                            <span>{insight}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </SheetContent>
      </Sheet>

      {/* Email Viewer */}
      <EmailViewer 
        email={viewingEmail}
        open={!!viewingEmail}
        onOpenChange={(open) => !open && setViewingEmail(null)}
      />
    </div>
  );
};

export default Funnels;
