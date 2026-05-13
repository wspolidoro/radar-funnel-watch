import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  ArrowLeft, 
  ShieldCheck, 
  Mail, 
  Info,
  Clock,
  ChevronRight
} from 'lucide-react';

export default function DomainVerification() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-email`;

  const { data: domain, isLoading } = useQuery({
    queryKey: ['email-domain', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  const verifyDnsMutation = useMutation({
    mutationFn: async () => {
      if (!domain) return;
      setIsVerifying(true);
      const { data, error } = await supabase.functions.invoke('verify-dns', {
        body: { domainId: domain.id, domain: domain.domain },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-domain', id] });
      if (data?.is_correct) {
        toast.success('DNS Verificado!', { description: 'Seu domínio agora pode receber e-mails.' });
      } else {
        toast.error('DNS ainda não propagado', { description: 'Verifique os registros e tente novamente em alguns minutos.' });
      }
      setIsVerifying(false);
    },
    onError: (error: any) => {
      toast.error('Erro na verificação', { description: error.message });
      setIsVerifying(false);
    }
  });

  const testConnectivityMutation = useMutation({
    mutationFn: async () => {
      if (!domain) return;
      setIsTesting(true);
      const { data, error } = await supabase.functions.invoke('test-email-connectivity', {
        body: { domainId: domain.id, domain: domain.domain, userId: domain.user_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.info('Email de teste enviado!', { description: 'Aguardando confirmação de recebimento...' });
      
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
          setIsTesting(false);
          toast.success('Conexão estabelecida com sucesso!');
          queryClient.invalidateQueries({ queryKey: ['email-domain', id] });
        } else if (testResult?.status === 'failed' || attempts > 20) {
          clearInterval(interval);
          setIsTesting(false);
          toast.error('Falha no teste', { description: 'O e-mail não chegou. Verifique o Webhook no Maileroo.' });
        }
      }, 3000);
    },
    onError: (error: any) => {
      toast.error('Erro ao testar', { description: error.message });
      setIsTesting(false);
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado para a área de transferência');
  };

  if (isLoading) return <div className="flex items-center justify-center min-h-screen"><RefreshCw className="animate-spin h-8 w-8 text-primary" /></div>;
  if (!domain) return <div className="p-8 text-center">Domínio não encontrado.</div>;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/app/settings?tab=domains')} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para Configurações
        </Button>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          {domain.is_verified ? (
            <Badge className="bg-success">Verificado</Badge>
          ) : (
            <Badge variant="outline" className="text-amber-500 border-amber-500 animate-pulse">Aguardando Configuração</Badge>
          )}
        </div>
      </div>

      <header className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          Verificar Domínio: <span className="text-primary">{domain.domain}</span>
        </h1>
        <p className="text-muted-foreground">
          Siga os passos abaixo no painel do Maileroo para ativar a captura de campanhas.
        </p>
      </header>

      <div className="grid gap-6">
        {/* Step 1: DNS */}
        <Card className={domain.is_verified ? 'border-success/30 bg-success/5' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                1. Configuração de DNS (MX)
              </span>
              {domain.is_verified && <CheckCircle className="h-5 w-5 text-success" />}
            </CardTitle>
            <CardDescription>
              Aponte o tráfego de e-mail do seu domínio para o servidor de processamento.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-background border rounded-lg space-y-3 font-mono text-sm">
              <div className="grid grid-cols-4 gap-2 text-muted-foreground border-b pb-2">
                <span>Tipo</span>
                <span>Host</span>
                <span className="col-span-2">Valor / Destino</span>
              </div>
              <div className="grid grid-cols-4 gap-2 items-center">
                <Badge variant="outline" className="w-fit">MX</Badge>
                <span>@</span>
                <span className="col-span-2 flex items-center justify-between bg-muted p-1 px-2 rounded">
                  mx.maileroo.com
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard('mx.maileroo.com')} className="h-6 w-6">
                    <Copy className="h-3 w-3" />
                  </Button>
                </span>
              </div>
              <div className="text-xs text-muted-foreground pt-2">
                * Prioridade recomendada: 10
              </div>
            </div>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Dica de Propagação</AlertTitle>
              <AlertDescription>
                Alterações de DNS podem levar de alguns minutos até 24 horas para propagar globalmente.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="bg-muted/30 py-3">
            <Button 
              onClick={() => verifyDnsMutation.mutate()} 
              disabled={isVerifying || domain.is_verified}
              className="w-full sm:w-auto"
            >
              {isVerifying ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {domain.is_verified ? 'DNS Verificado' : 'Verificar Registros DNS'}
            </Button>
          </CardFooter>
        </Card>

        {/* Step 2: Webhook */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              2. Configuração de Webhook no Maileroo
            </CardTitle>
            <CardDescription>
              Encaminhe os e-mails recebidos para o processador de IA do RadarMail.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">URL do Webhook (Destination URL)</label>
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg font-mono text-xs">
                <span className="truncate flex-1">{webhookUrl}</span>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookUrl)} className="gap-2">
                  <Copy className="h-3 w-3" /> Copiar URL
                </Button>
              </div>
            </div>

            <div className="space-y-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Como configurar no Maileroo:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Acesse o painel do <strong>Maileroo</strong></li>
                <li>Vá em <strong>Inbound Routing</strong> ou <strong>Webhooks</strong></li>
                <li>Adicione uma nova rota para <code>*@{domain.domain}</code></li>
                <li>Cole a URL acima no campo de destino (Webhook)</li>
              </ol>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 py-3 flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              onClick={() => testConnectivityMutation.mutate()} 
              disabled={isTesting || !domain.is_verified}
              className="w-full sm:w-auto"
            >
              {isTesting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
              Testar Conexão Real
            </Button>
            <Button variant="link" asChild className="gap-2">
              <a href="https://maileroo.com" target="_blank" rel="noopener noreferrer">
                Ir para o Maileroo <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </CardFooter>
        </Card>

        {/* Integration Guide */}
        <div className="flex items-center justify-between p-4 border rounded-xl bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold">O que esperar agora?</p>
              <p className="text-sm text-muted-foreground">Assim que o primeiro e-mail chegar, nossa IA criará o funil automaticamente.</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </div>
    </div>
  );
}
