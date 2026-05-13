import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Plus, Globe, CheckCircle, AlertCircle, Trash2, Copy, Info, RefreshCw, ExternalLink, ShieldCheck, Mail } from 'lucide-react';
import { ConnectionModelGuide } from './ConnectionModelGuide';

interface EmailDomain {
  id: string;
  domain: string;
  provider: string;
  is_verified: boolean;
  is_active: boolean;
  webhook_secret: string | null;
  created_at: string;
  dns_status: string | null;
  dns_verified_at: string | null;
}

export function DomainManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [provider, setProvider] = useState('maileroo');
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-email`;

  // Fetch domains
  const { data: domains = [], isLoading } = useQuery({
    queryKey: ['email-domains', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailDomain[];
    },
    enabled: !!user,
  });

  // Create domain mutation
  const createDomainMutation = useMutation({
    mutationFn: async () => {
      if (!domain) {
        throw new Error('Digite o domínio');
      }

      const cleanDomain = domain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      
      if (!cleanDomain.includes('.')) {
        throw new Error('Domínio inválido');
      }

      const { data, error } = await supabase
        .from('email_domains')
        .insert({
          user_id: user?.id,
          domain: cleanDomain,
          provider,
          is_verified: false,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      toast.success('Domínio adicionado!', {
        description: 'Agora configure os registros DNS e o Webhook.',
      });
      setIsOpen(false);
      setDomain('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar domínio', { description: error.message });
    },
  });

  // Verify DNS mutation
  const verifyDnsMutation = useMutation({
    mutationFn: async ({ domainId, domainName }: { domainId: string; domainName: string }) => {
      setIsVerifying(domainId);
      const { data, error } = await supabase.functions.invoke('verify-dns', {
        body: { domainId, domain: domainName },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      if (data.is_correct) {
        toast.success('DNS verificado com sucesso!', {
          description: 'Seu domínio está pronto para receber emails.',
        });
      } else {
        toast.error('Registros DNS incorretos', {
          description: data.error || 'Verifique se os registros MX estão apontando para mx.maileroo.com.',
        });
      }
      setIsVerifying(null);
    },
    onError: (error: Error) => {
      toast.error('Erro ao verificar DNS', { description: error.message });
      setIsVerifying(null);
    },
  });

  // Test Connectivity mutation
  const testConnectivityMutation = useMutation({
    mutationFn: async ({ domainId, domainName }: { domainId: string; domainName: string }) => {
      setIsTesting(domainId);
      const { data, error } = await supabase.functions.invoke('test-email-connectivity', {
        body: { domainId, domain: domainName, userId: user?.id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.info('Email de teste enviado!', {
        description: 'Aguardando o email chegar ao nosso servidor... (pode levar até 1 min)',
      });
      
      // Start polling for test result
      const testId = data.testId;
      let attempts = 0;
      const interval = setInterval(async () => {
        attempts++;
        const { data: testResult } = await supabase
          .from('connectivity_tests')
          .select('*')
          .eq('id', testId)
          .single();
        
        if (testResult?.status === 'success') {
          clearInterval(interval);
          setIsTesting(null);
          toast.success('Conectividade confirmada!', {
            description: `Email recebido em ${testResult.latency_ms}ms. Tudo pronto!`,
          });
          queryClient.invalidateQueries({ queryKey: ['email-domains'] });
        } else if (testResult?.status === 'failed' || attempts > 20) {
          clearInterval(interval);
          setIsTesting(null);
          toast.error('Falha na conectividade', {
            description: testResult?.error_message || 'O email de teste não chegou. Verifique seu Webhook.',
          });
        }
      }, 3000);
    },
    onError: (error: Error) => {
      toast.error('Erro ao iniciar teste', { description: error.message });
      setIsTesting(null);
    },
  });

  // Delete domain mutation
  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: string) => {
      const { error } = await supabase
        .from('email_domains')
        .delete()
        .eq('id', domainId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      toast.success('Domínio removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover domínio', { description: error.message });
    },
  });

  // Toggle domain active status
  const toggleDomainMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('email_domains')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  const getDnsStatusBadge = (domain: EmailDomain) => {
    if (domain.is_verified) {
      return (
        <Badge variant="default" className="bg-success">
          <CheckCircle className="w-3 h-3 mr-1" /> DNS Verificado
        </Badge>
      );
    }
    
    switch (domain.dns_status) {
      case 'incorrect':
        return (
          <Badge variant="destructive">
            <AlertCircle className="w-3 h-3 mr-1" /> DNS Incorreto
          </Badge>
        );
      case 'no_records':
        return (
          <Badge variant="outline" className="text-amber-600 border-amber-600">
            <AlertCircle className="w-3 h-3 mr-1" /> Sem Registros MX
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-3 h-3 mr-1" /> Aguardando DNS
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      <ConnectionModelGuide />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configuração de Domínios de Destino</CardTitle>
            <CardDescription>
              Domínios próprios usados para capturar emails de campanhas
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Novo Domínio
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Novo Domínio de Captura</DialogTitle>
                <DialogDescription>
                  Configure um domínio ou subdomínio para rotear emails para análise IA
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="domain">Domínio / Subdomínio</Label>
                    <Input
                      id="domain"
                      placeholder="emails.seudominio.com"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provedor de Roteamento</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="maileroo">Maileroo (Recomendado)</SelectItem>
                        <SelectItem value="mailgun">Mailgun</SelectItem>
                        <SelectItem value="sendgrid">SendGrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      1. Registros DNS (MX)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      No seu provedor de DNS (Cloudflare, GoDaddy, etc), adicione este registro:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-xs">
                      <Badge variant="outline">MX</Badge>
                      <span className="flex-1 text-primary">mx.maileroo.com</span>
                      <Badge variant="outline">Prioridade: 10</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      2. Configuração de Webhook
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      No painel do provedor de roteamento, configure o URL de destino:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-xs">
                      <span className="truncate flex-1">{webhookUrl}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookUrl)} className="h-6 w-6">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={() => createDomainMutation.mutate()}
                    disabled={!domain || createDomainMutation.isPending}
                    className="flex-1"
                  >
                    {createDomainMutation.isPending ? 'Adicionando...' : 'Confirmar e Adicionar'}
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://maileroo.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                      Abrir Maileroo <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : domains.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-xl text-muted-foreground">
              <Globe className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">Nenhum domínio configurado</h3>
              <p className="max-w-xs mx-auto mt-1 mb-6">
                Conecte um domínio próprio para capturar emails com sua marca.
              </p>
              <Button variant="outline" onClick={() => setIsOpen(true)}>
                Configurar Meu Primeiro Domínio
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {domains.map((d) => (
                <div
                  key={d.id}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-all gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg">{d.domain}</span>
                        {getDnsStatusBadge(d)}
                        {!d.is_active && (
                          <Badge variant="secondary">Inativo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className="capitalize">{d.provider}</span>
                        <span>•</span>
                        <span>{new Date(d.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => navigate(`/app/configuracoes/dominios/${d.id}/verificar`)}
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Configurar & Verificar
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => deleteDomainMutation.mutate(d.id)}
                      disabled={deleteDomainMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
