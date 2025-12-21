import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink, Check, AlertTriangle, Mail, Globe, Server, Shield, Key, Settings2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

const EmailProviderSetup = () => {
  const [copiedItem, setCopiedItem] = useState<string | null>(null);

  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-email`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedItem(label);
    toast.success('Copiado!');
    setTimeout(() => setCopiedItem(null), 2000);
  };

  const CopyButton = ({ text, label }: { text: string; label: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, label)}
      className="gap-2"
    >
      {copiedItem === label ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      Copiar
    </Button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Mail className="h-8 w-8" />
          Configurar Maileroo
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure o Maileroo para enviar e receber emails nos domínios da plataforma
        </p>
      </div>

      {/* Webhook URL */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            URL do Webhook (Inbound Routing)
          </CardTitle>
          <CardDescription>
            Use esta URL para configurar o encaminhamento de emails no Maileroo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg font-mono text-sm">
            <code className="flex-1 break-all">{webhookUrl}</code>
            <CopyButton text={webhookUrl} label="webhook" />
          </div>
        </CardContent>
      </Card>

      {/* Maileroo Setup Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Configuração do Maileroo</CardTitle>
          <CardDescription>
            Siga os passos abaixo para configurar envio e recebimento de emails via Maileroo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Step 1 - Create Account */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
              <h3 className="font-semibold text-lg">Criar conta no Maileroo</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-muted-foreground">
                Acesse o Maileroo e crie uma conta se ainda não tiver:
              </p>
              <Button variant="outline" className="gap-2" asChild>
                <a href="https://app.maileroo.com" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Acessar Maileroo
                </a>
              </Button>
            </div>
          </div>

          {/* Step 2 - Add Domain */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
              <h3 className="font-semibold text-lg">Adicionar e verificar domínio</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-muted-foreground">
                Vá para <strong>Sending → Domains</strong> e adicione os domínios da plataforma:
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><code className="bg-muted px-1 rounded">tracker.newsletterspy.io</code></li>
                <li><code className="bg-muted px-1 rounded">inbox.newsletterspy.io</code></li>
                <li><code className="bg-muted px-1 rounded">watch.newsletterspy.io</code></li>
                <li><code className="bg-muted px-1 rounded">capture.newsletterspy.io</code></li>
                <li><code className="bg-muted px-1 rounded">monitor.newsletterspy.io</code></li>
              </ul>
              <Button variant="outline" className="gap-2" asChild>
                <a href="https://app.maileroo.com/sending/domains" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Gerenciar Domínios
                </a>
              </Button>
            </div>
          </div>

          {/* Step 3 - Configure DNS for Receiving */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
              <h3 className="font-semibold text-lg">Configurar DNS para recebimento</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-muted-foreground">
                Adicione os registros MX no DNS de cada domínio para receber emails:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                <p><span className="text-muted-foreground">Tipo:</span> MX</p>
                <p><span className="text-muted-foreground">Host:</span> @ (ou deixe em branco)</p>
                <p><span className="text-muted-foreground">Valor:</span> mx.maileroo.com</p>
                <p><span className="text-muted-foreground">Prioridade:</span> 10</p>
              </div>
              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <p className="text-sm">
                  Aguarde a propagação DNS (pode levar até 48h). Verifique em <strong>Receiving → Domains</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Step 4 - Configure Inbound Routing */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                4
              </div>
              <h3 className="font-semibold text-lg">Configurar Inbound Routing</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-muted-foreground">
                Vá para <strong>Receiving → Inbound Routing</strong> e crie uma regra:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-4 font-mono text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Domain:</p>
                  <p>Selecione cada domínio adicionado</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Expression Type:</p>
                  <p><Badge variant="secondary">Catch All</Badge></p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Action:</p>
                  <p><Badge variant="secondary">Webhook</Badge></p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Webhook URL:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all">{webhookUrl}</code>
                    <CopyButton text={webhookUrl} label="inbound-url" />
                  </div>
                </div>
              </div>
              <Button variant="outline" className="gap-2" asChild>
                <a href="https://app.maileroo.com/receiving/routing" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Configurar Inbound Routing
                </a>
              </Button>
            </div>
          </div>

          {/* Step 5 - Create Sending Key */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                5
              </div>
              <h3 className="font-semibold text-lg">Criar Sending Key (API Key)</h3>
            </div>
            <div className="ml-11 space-y-3">
              <p className="text-muted-foreground">
                Vá para <strong>Sending → Sending Keys</strong> e crie uma chave API para envio de emails:
              </p>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span>Nome sugerido: <code className="bg-background px-1 rounded">newsletter-tracker-production</code></span>
                </div>
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span>Permissões: Selecione os domínios adicionados</span>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm">
                  Copie a API Key gerada e adicione como secret <code className="bg-muted px-1 rounded">MAILEROO_API_KEY</code> nas configurações do projeto.
                </p>
              </div>
              <Button variant="outline" className="gap-2" asChild>
                <a href="https://app.maileroo.com/sending/keys" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Gerenciar Sending Keys
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Documentação e Suporte
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://app.maileroo.com/support" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Central de Suporte
              </a>
            </Button>
            <Button variant="outline" className="justify-start gap-2" asChild>
              <a href="https://docs.maileroo.com" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
                Documentação da API
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status da Configuração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span>tracker.newsletterspy.io</span>
              </div>
              <Badge variant="outline">Aguardando configuração DNS</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <span>inbox.newsletterspy.io</span>
              </div>
              <Badge variant="outline">Aguardando configuração DNS</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Key className="h-5 w-5 text-muted-foreground" />
                <span>MAILEROO_API_KEY</span>
              </div>
              <Badge className="bg-success">Configurada</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-muted-foreground" />
                <span>Webhook receive-email</span>
              </div>
              <Badge className="bg-success">Funcionando</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailProviderSetup;
