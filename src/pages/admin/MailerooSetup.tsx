import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle2, 
  Copy, 
  ExternalLink, 
  Globe, 
  Mail, 
  Server, 
  Shield,
  Webhook,
  AlertTriangle,
  ArrowRight,
  Check
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const WEBHOOK_URL = 'https://owclqmcjxlypohbfddnw.supabase.co/functions/v1/receive-email';

export default function MailerooSetup() {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const copyToClipboard = (text: string, item: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(item);
    toast({
      title: 'Copiado!',
      description: `${item} copiado para a área de transferência`,
    });
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const steps = [
    {
      number: 1,
      title: 'Criar conta no Maileroo',
      description: 'Se ainda não tem, crie uma conta gratuita no Maileroo',
      action: (
        <Button variant="outline" className="gap-2" asChild>
          <a href="https://maileroo.com" target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4" />
            Acessar Maileroo
          </a>
        </Button>
      ),
    },
    {
      number: 2,
      title: 'Adicionar domínio',
      description: 'No painel do Maileroo, adicione seu domínio (ex: animaflix.com.br)',
      action: (
        <Button variant="outline" className="gap-2" asChild>
          <a href="https://maileroo.com/dashboard" target="_blank" rel="noopener noreferrer">
            <Globe className="h-4 w-4" />
            Painel Maileroo
          </a>
        </Button>
      ),
    },
    {
      number: 3,
      title: 'Configurar registros DNS',
      description: 'Configure os registros MX, SPF e DKIM conforme instruído pelo Maileroo',
    },
    {
      number: 4,
      title: 'Criar rota de Inbound',
      description: 'Configure o Inbound Routing para enviar emails para nosso webhook',
    },
    {
      number: 5,
      title: 'Testar conectividade',
      description: 'Volte à página de domínios e teste a conectividade',
      action: (
        <Button variant="outline" className="gap-2" asChild>
          <a href="/admin/domains">
            <CheckCircle2 className="h-4 w-4" />
            Testar Domínios
          </a>
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Mail className="h-8 w-8" />
          Configuração do Maileroo
        </h1>
        <p className="text-muted-foreground mt-1">
          Guia completo para configurar o recebimento de emails via Maileroo
        </p>
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" />
              Provedor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Maileroo</div>
            <p className="text-xs text-muted-foreground">Inbound Routing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-green-500" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">SPF + DKIM</div>
            <p className="text-xs text-muted-foreground">DMARC aligned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Webhook className="h-4 w-4 text-blue-500" />
              Integração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Webhook</div>
            <p className="text-xs text-muted-foreground">JSON payload</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="steps" className="space-y-4">
        <TabsList>
          <TabsTrigger value="steps">Passo a Passo</TabsTrigger>
          <TabsTrigger value="dns">Configuração DNS</TabsTrigger>
          <TabsTrigger value="webhook">Webhook</TabsTrigger>
          <TabsTrigger value="troubleshooting">Problemas Comuns</TabsTrigger>
        </TabsList>

        <TabsContent value="steps" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Passos para Configuração</CardTitle>
              <CardDescription>
                Siga estes passos na ordem para configurar o Maileroo corretamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {steps.map((step, index) => (
                <div key={step.number} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="flex-1 pb-6">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-muted-foreground text-sm mt-1">{step.description}</p>
                    {step.action && <div className="mt-3">{step.action}</div>}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="dns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Registros DNS Necessários</CardTitle>
              <CardDescription>
                Configure estes registros no painel DNS do seu domínio
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* MX Records */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">MX</Badge>
                  Registros MX (Mail Exchange)
                </h3>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Importante</AlertTitle>
                  <AlertDescription>
                    Remova todos os registros MX existentes antes de adicionar os do Maileroo
                  </AlertDescription>
                </Alert>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <code className="text-sm">MX 10 mx1.maileroo.com</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('mx1.maileroo.com', 'MX1')}
                    >
                      {copiedItem === 'MX1' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <code className="text-sm">MX 20 mx2.maileroo.com</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('mx2.maileroo.com', 'MX2')}
                    >
                      {copiedItem === 'MX2' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  * Os registros MX exatos podem variar. Consulte o painel do Maileroo para os valores corretos.
                </p>
              </div>

              {/* SPF Record */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">TXT</Badge>
                  Registro SPF
                </h3>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <code className="text-sm break-all">v=spf1 include:_spf.maileroo.com ~all</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('v=spf1 include:_spf.maileroo.com ~all', 'SPF')}
                    >
                      {copiedItem === 'SPF' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* DKIM Record */}
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <Badge variant="outline">TXT</Badge>
                  Registro DKIM
                </h3>
                <p className="text-sm text-muted-foreground">
                  O registro DKIM é gerado pelo Maileroo e é único para cada domínio. 
                  Acesse o painel do Maileroo para obter o valor correto.
                </p>
                <Button variant="outline" className="gap-2" asChild>
                  <a href="https://maileroo.com/dashboard" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Ver DKIM no Maileroo
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="webhook" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Webhook</CardTitle>
              <CardDescription>
                Configure o Inbound Routing no Maileroo para enviar emails para este endpoint
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Webhook URL */}
              <div className="space-y-3">
                <h3 className="font-semibold">URL do Webhook</h3>
                <div className="bg-muted rounded-lg p-4">
                  <div className="flex items-center justify-between gap-4">
                    <code className="text-sm break-all">{WEBHOOK_URL}</code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(WEBHOOK_URL, 'Webhook URL')}
                    >
                      {copiedItem === 'Webhook URL' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                <h3 className="font-semibold">Como configurar no Maileroo</h3>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  <li>Acesse o painel do Maileroo</li>
                  <li>Selecione seu domínio</li>
                  <li>Vá em <strong>Sending → Inbound Routing</strong></li>
                  <li>Clique em <strong>Create New Route</strong></li>
                  <li>Configure:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li><strong>Expression Type:</strong> Catch All</li>
                      <li><strong>Action:</strong> Webhook</li>
                      <li><strong>Webhook URL:</strong> Cole a URL acima</li>
                    </ul>
                  </li>
                  <li>Ative a rota</li>
                </ol>
              </div>

              {/* Webhook Tester */}
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Dica</AlertTitle>
                <AlertDescription>
                  Use o <strong>Webhook Tester</strong> do Maileroo para testar se o webhook está funcionando 
                  antes de enviar emails reais.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="troubleshooting" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Problemas Comuns</CardTitle>
              <CardDescription>
                Soluções para os problemas mais frequentes na configuração
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    DNS não verificado / MX Incorreto
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Causa:</strong> Os registros MX ainda apontam para outro provedor.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Solução:</strong> Remova os registros MX antigos e adicione os do Maileroo. 
                    Aguarde até 48h para propagação DNS.
                  </p>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Email enviado mas não recebido
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Causa:</strong> Inbound Routing não configurado corretamente.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Solução:</strong> Verifique se a rota está ativa e a URL do webhook está correta.
                    Use o Webhook Tester para validar.
                  </p>
                </div>

                <div className="border-b pb-4">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Erro 401 no webhook
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Causa:</strong> Problema de autenticação no endpoint.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Solução:</strong> O endpoint receive-email não requer autenticação. 
                    Verifique se a URL está correta.
                  </p>
                </div>

                <div className="pb-4">
                  <h3 className="font-semibold text-destructive flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Emails marcados como spam
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    <strong>Causa:</strong> SPF ou DKIM não configurados corretamente.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Solução:</strong> Configure os registros SPF e DKIM conforme instruído pelo Maileroo.
                    Verifique se o DMARC está alinhado.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <Button variant="outline" className="gap-2" asChild>
                  <a href="https://maileroo.com/docs/inbound-routing/" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                    Documentação Oficial do Maileroo
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}