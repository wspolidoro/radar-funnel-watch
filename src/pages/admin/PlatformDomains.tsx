import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Shield,
  Server,
  Search,
  Wifi,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlatformDomain {
  id: string;
  domain: string;
  provider: string;
  is_verified: boolean | null;
  is_active: boolean | null;
  is_platform_domain: boolean | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  mx_records: unknown;
  dns_verified_at: string | null;
  dns_status: string | null;
}

interface ConnectivityTest {
  id: string;
  domain_id: string;
  test_alias: string;
  status: string;
  latency_ms: number | null;
  sent_at: string;
  received_at: string | null;
  error_message: string | null;
}

export default function PlatformDomains() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newProvider, setNewProvider] = useState('maileroo');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [verifyingDomains, setVerifyingDomains] = useState<Set<string>>(new Set());
  const [testingDomains, setTestingDomains] = useState<Set<string>>(new Set());

  // Fetch all platform domains
  const { data: domains, isLoading } = useQuery({
    queryKey: ['platform-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('is_platform_domain', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlatformDomain[];
    },
  });

  // Fetch connectivity tests
  const { data: tests } = useQuery({
    queryKey: ['connectivity-tests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('connectivity_tests')
        .select('*')
        .order('sent_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as ConnectivityTest[];
    },
    refetchInterval: 5000, // Poll for test results
  });

  // Get latest test for a domain
  const getLatestTest = (domainId: string) => {
    return tests?.find(t => t.domain_id === domainId);
  };

  // Add new domain
  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('email_domains')
        .insert({
          domain: newDomain.trim().toLowerCase(),
          provider: newProvider,
          is_platform_domain: true,
          is_verified: false,
          is_active: true,
          user_id: userData.user.id,
          dns_status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Domínio adicionado',
        description: 'O domínio da plataforma foi criado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      setIsAddOpen(false);
      setNewDomain('');
      setNewProvider('maileroo');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Verify DNS
  const verifyDns = async (domain: PlatformDomain) => {
    setVerifyingDomains(prev => new Set([...prev, domain.id]));
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-dns', {
        body: { domainId: domain.id, domain: domain.domain },
      });

      if (error) throw error;

      if (data.is_correct) {
        toast({
          title: 'DNS verificado ✓',
          description: `MX records apontando corretamente para ${data.expected_mx}`,
        });
      } else {
        toast({
          title: 'DNS incorreto',
          description: `Esperado: ${data.expected_mx}. Encontrado: ${data.found_mx?.map((m: {exchange: string}) => m.exchange).join(', ') || 'nenhum'}`,
          variant: 'destructive',
        });
      }

      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
    } catch (error) {
      toast({
        title: 'Erro na verificação',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setVerifyingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domain.id);
        return newSet;
      });
    }
  };

  // Test connectivity
  const testConnectivity = async (domain: PlatformDomain) => {
    if (!user) return;
    
    setTestingDomains(prev => new Set([...prev, domain.id]));
    
    try {
      const { data, error } = await supabase.functions.invoke('test-email-connectivity', {
        body: { domainId: domain.id, domain: domain.domain, userId: user.id },
      });

      if (error) throw error;

      toast({
        title: 'Teste iniciado',
        description: `Email de teste enviado para ${data.testAlias}. Aguardando recepção...`,
      });

      queryClient.invalidateQueries({ queryKey: ['connectivity-tests'] });
    } catch (error) {
      toast({
        title: 'Erro no teste',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setTestingDomains(prev => {
        const newSet = new Set(prev);
        newSet.delete(domain.id);
        return newSet;
      });
    }
  };

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('email_domains')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast({ title: 'Status atualizado' });
    },
  });

  // Delete domain
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast({ title: 'Domínio removido' });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const getDnsStatusBadge = (domain: PlatformDomain) => {
    switch (domain.dns_status) {
      case 'verified':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="gap-1 bg-green-500">
                <CheckCircle2 className="h-3 w-3" />
                DNS OK
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">MX Records:</p>
                {Array.isArray(domain.mx_records) && domain.mx_records.map((mx: { preference: number; exchange: string }, i: number) => (
                  <p key={i}>{mx.preference} {mx.exchange}</p>
                ))}
                {domain.dns_verified_at && (
                  <p className="text-muted-foreground mt-1">
                    Verificado: {formatDistanceToNow(new Date(domain.dns_verified_at), { addSuffix: true, locale: ptBR })}
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        );
      case 'incorrect':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                MX Incorreto
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <p className="font-medium">MX encontrados:</p>
                {Array.isArray(domain.mx_records) && domain.mx_records.length ? (
                  domain.mx_records.map((mx: { preference: number; exchange: string }, i: number) => (
                    <p key={i}>{mx.preference} {mx.exchange}</p>
                  ))
                ) : (
                  <p>Nenhum</p>
                )}
                <p className="text-amber-400 mt-1">Esperado: mx.maileroo.com</p>
              </div>
            </TooltipContent>
          </Tooltip>
        );
      case 'no_records':
        return (
          <Badge variant="outline" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Sem MX
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="gap-1">
            <Clock className="h-3 w-3" />
            Pendente
          </Badge>
        );
    }
  };

  const getTestStatusBadge = (test: ConnectivityTest | undefined) => {
    if (!test) {
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Não testado
        </Badge>
      );
    }

    switch (test.status) {
      case 'success':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge className="gap-1 bg-green-500">
                <Wifi className="h-3 w-3" />
                {test.latency_ms}ms
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recebido em {test.latency_ms}ms</p>
              <p className="text-muted-foreground">
                {formatDistanceToNow(new Date(test.received_at!), { addSuffix: true, locale: ptBR })}
              </p>
            </TooltipContent>
          </Tooltip>
        );
      case 'sent':
      case 'pending':
        return (
          <Badge variant="outline" className="gap-1">
            <Loader2 className="h-3 w-3 animate-spin" />
            Aguardando...
          </Badge>
        );
      case 'failed':
        return (
          <Tooltip>
            <TooltipTrigger>
              <Badge variant="destructive" className="gap-1">
                <XCircle className="h-3 w-3" />
                Falhou
              </Badge>
            </TooltipTrigger>
            <TooltipContent>{test.error_message}</TooltipContent>
          </Tooltip>
        );
      default:
        return <Badge variant="secondary">{test.status}</Badge>;
    }
  };

  const activeDomains = domains?.filter(d => d.is_active) || [];
  const verifiedDomains = domains?.filter(d => d.dns_status === 'verified') || [];

  // Quick test all domains
  const testAllDomains = async () => {
    if (!domains || !user) return;
    
    for (const domain of domains.filter(d => d.is_active)) {
      await testConnectivity(domain);
    }
  };

  // Verify all domains
  const verifyAllDomains = async () => {
    if (!domains) return;
    
    for (const domain of domains.filter(d => d.is_active)) {
      await verifyDns(domain);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Domínios da Plataforma
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os domínios gratuitos disponíveis para geração de emails de rastreamento
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Domínio
        </Button>
      </div>

      {/* Quick Actions */}
      {domains && domains.length > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Wifi className="h-5 w-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              onClick={verifyAllDomains}
              variant="outline"
              className="gap-2"
              disabled={verifyingDomains.size > 0}
            >
              {verifyingDomains.size > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Verificar DNS de Todos
            </Button>
            <Button
              onClick={testAllDomains}
              variant="default"
              className="gap-2"
              disabled={testingDomains.size > 0}
            >
              {testingDomains.size > 0 ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Wifi className="h-4 w-4" />
              )}
              Testar Conectividade de Todos
            </Button>
            
            {/* DNS Instructions for Maileroo */}
            <div className="w-full mt-2 p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-1">📧 Configuração DNS para Maileroo:</p>
              <div className="grid gap-1 text-muted-foreground">
                <p>1. <strong>Registro MX:</strong> <code className="bg-background px-1 rounded">mx.maileroo.com</code> (prioridade 10)</p>
                <p>2. <strong>Inbound Routing:</strong> Configure no painel Maileroo para enviar para o webhook</p>
                <p>3. <strong>Webhook URL:</strong> <code className="bg-background px-1 rounded text-xs break-all">https://owclqmcjxlypohbfddnw.supabase.co/functions/v1/receive-email</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Total de Domínios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{domains?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              DNS Verificado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{verifiedDomains.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeDomains.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Domínios Configurados</CardTitle>
          <CardDescription>
            Estes domínios ficam disponíveis gratuitamente para todos os usuários criarem emails de rastreamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : domains?.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum domínio configurado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione domínios para os usuários criarem emails de rastreamento gratuitos.
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Domínio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>DNS Status</TableHead>
                  <TableHead>Conectividade</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains?.map(domain => {
                  const latestTest = getLatestTest(domain.id);
                  return (
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4 text-primary" />
                          {domain.domain}
                          <Badge variant="outline" className="gap-1">
                            <Server className="h-3 w-3" />
                            {domain.provider}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getDnsStatusBadge(domain)}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => verifyDns(domain)}
                            disabled={verifyingDomains.has(domain.id)}
                          >
                            {verifyingDomains.has(domain.id) ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Search className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTestStatusBadge(latestTest)}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant={domain.dns_status !== 'verified' ? 'outline' : 'ghost'}
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => testConnectivity(domain)}
                                disabled={testingDomains.has(domain.id)}
                              >
                                {testingDomains.has(domain.id) ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Wifi className="h-4 w-4" />
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {domain.dns_status !== 'verified' 
                                ? 'DNS não verificado, mas você pode testar mesmo assim' 
                                : 'Testar conectividade'}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={domain.is_active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: domain.id, active: checked })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {format(new Date(domain.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteConfirm(domain.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Domínio da Plataforma</DialogTitle>
            <DialogDescription>
              Adicione um domínio que ficará disponível gratuitamente para todos os usuários.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio</Label>
              <Input
                id="domain"
                placeholder="tracker.meusite.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provedor de Email</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maileroo">Maileroo</SelectItem>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Configuração Maileroo:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Configure o registro MX para <code>mx.maileroo.com</code></li>
                <li>Após adicionar, clique em "Verificar DNS"</li>
                <li>Configure o Inbound Routing no Maileroo</li>
                <li>Teste a conectividade enviando um email de teste</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newDomain.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este domínio? Usuários não poderão mais criar emails com ele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
