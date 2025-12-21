import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ExternalLink, Check, AlertTriangle, Mail, Globe, Server, Shield } from 'lucide-react';
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
          Configurar Provedor de Email
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure Mailgun ou SendGrid para receber emails nos domínios da plataforma
        </p>
      </div>

      {/* Webhook URL */}
      <Card className="border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            URL do Webhook
          </CardTitle>
          <CardDescription>
            Use esta URL para configurar o encaminhamento de emails no seu provedor
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg font-mono text-sm">
            <code className="flex-1 break-all">{webhookUrl}</code>
            <CopyButton text={webhookUrl} label="webhook" />
          </div>
        </CardContent>
      </Card>

      {/* Provider Tabs */}
      <Tabs defaultValue="mailgun" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mailgun" className="gap-2">
            Mailgun
          </TabsTrigger>
          <TabsTrigger value="sendgrid" className="gap-2">
            SendGrid
          </TabsTrigger>
        </TabsList>

        {/* Mailgun Setup */}
        <TabsContent value="mailgun" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do Mailgun</CardTitle>
              <CardDescription>
                Siga os passos abaixo para configurar o recebimento de emails via Mailgun
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-lg">Criar conta e adicionar domínio</h3>
                </div>
                <div className="ml-11 space-y-2">
                  <p className="text-muted-foreground">
                    Acesse o Mailgun e adicione os domínios da plataforma:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li><code className="bg-muted px-1 rounded">tracker.newsletterspy.io</code></li>
                    <li><code className="bg-muted px-1 rounded">inbox.newsletterspy.io</code></li>
                    <li><code className="bg-muted px-1 rounded">watch.newsletterspy.io</code></li>
                    <li><code className="bg-muted px-1 rounded">capture.newsletterspy.io</code></li>
                    <li><code className="bg-muted px-1 rounded">monitor.newsletterspy.io</code></li>
                  </ul>
                  <Button variant="outline" className="gap-2 mt-2" asChild>
                    <a href="https://app.mailgun.com/app/sending/domains" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir Mailgun
                    </a>
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-lg">Configurar registros DNS</h3>
                </div>
                <div className="ml-11 space-y-3">
                  <p className="text-muted-foreground">
                    Adicione os registros MX no DNS de cada domínio:
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                    <p><span className="text-muted-foreground">Tipo:</span> MX</p>
                    <p><span className="text-muted-foreground">Host:</span> @ (ou deixe em branco)</p>
                    <p><span className="text-muted-foreground">Valor:</span> mxa.mailgun.org</p>
                    <p><span className="text-muted-foreground">Prioridade:</span> 10</p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                    <p><span className="text-muted-foreground">Tipo:</span> MX</p>
                    <p><span className="text-muted-foreground">Host:</span> @ (ou deixe em branco)</p>
                    <p><span className="text-muted-foreground">Valor:</span> mxb.mailgun.org</p>
                    <p><span className="text-muted-foreground">Prioridade:</span> 20</p>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    3
                  </div>
                  <h3 className="font-semibold text-lg">Criar rota de recebimento</h3>
                </div>
                <div className="ml-11 space-y-3">
                  <p className="text-muted-foreground">
                    No Mailgun, vá para <strong>Receiving → Routes</strong> e crie uma rota:
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-3 font-mono text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Expression Type:</p>
                      <p>catch_all()</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Actions:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all">forward("{webhookUrl}")</code>
                        <CopyButton text={`forward("${webhookUrl}")`} label="forward" />
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href="https://app.mailgun.com/app/receiving/routes" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Criar Rota no Mailgun
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SendGrid Setup */}
        <TabsContent value="sendgrid" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configuração do SendGrid</CardTitle>
              <CardDescription>
                Siga os passos abaixo para configurar o recebimento de emails via SendGrid Inbound Parse
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    1
                  </div>
                  <h3 className="font-semibold text-lg">Configurar registros DNS</h3>
                </div>
                <div className="ml-11 space-y-3">
                  <p className="text-muted-foreground">
                    Adicione o registro MX no DNS de cada domínio apontando para o SendGrid:
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-2 font-mono text-sm">
                    <p><span className="text-muted-foreground">Tipo:</span> MX</p>
                    <p><span className="text-muted-foreground">Host:</span> @ (ou deixe em branco)</p>
                    <p><span className="text-muted-foreground">Valor:</span> mx.sendgrid.net</p>
                    <p><span className="text-muted-foreground">Prioridade:</span> 10</p>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    2
                  </div>
                  <h3 className="font-semibold text-lg">Configurar Inbound Parse</h3>
                </div>
                <div className="ml-11 space-y-3">
                  <p className="text-muted-foreground">
                    Acesse <strong>Settings → Inbound Parse</strong> no SendGrid e adicione:
                  </p>
                  <div className="bg-muted p-4 rounded-lg space-y-3 font-mono text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">Hostname:</p>
                      <p>tracker.newsletterspy.io</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">Destination URL:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 break-all">{webhookUrl}</code>
                        <CopyButton text={webhookUrl} label="sendgrid-url" />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                    <p className="text-sm">
                      Repita para cada domínio da plataforma (inbox, watch, capture, monitor)
                    </p>
                  </div>
                  <Button variant="outline" className="gap-2" asChild>
                    <a href="https://app.sendgrid.com/settings/parse" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                      Abrir SendGrid Inbound Parse
                    </a>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
