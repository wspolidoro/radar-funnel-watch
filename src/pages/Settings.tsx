import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, Bell, CreditCard, Plug, User, Globe } from 'lucide-react';
import { EmailSeedManager } from '@/components/EmailSeedManager';
import { ProfileSettings } from '@/components/ProfileSettings';
import { DomainManager } from '@/components/DomainManager';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seeds, domínios, integrações, alertas e equipe
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="domains" className="gap-2">
            <Globe className="h-4 w-4" />
            Domínios
          </TabsTrigger>
          <TabsTrigger value="seeds" className="gap-2">
            <Mail className="h-4 w-4" />
            Seeds & Integrações
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <Bell className="h-4 w-4" />
            Alertas
          </TabsTrigger>
          <TabsTrigger value="team" className="gap-2">
            <Users className="h-4 w-4" />
            Equipe
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Plano & Faturamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <ProfileSettings />
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <DomainManager />
          
          <Card>
            <CardHeader>
              <CardTitle>Como Funciona</CardTitle>
              <CardDescription>
                Configure seu domínio para receber emails via webhook
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">1</div>
                  <div>
                    <p className="font-medium">Adicione seu domínio</p>
                    <p className="text-sm text-muted-foreground">Configure um subdomínio como emails.seudominio.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">2</div>
                  <div>
                    <p className="font-medium">Configure o DNS</p>
                    <p className="text-sm text-muted-foreground">Aponte os registros MX para Mailgun ou SendGrid</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">3</div>
                  <div>
                    <p className="font-medium">Configure o Webhook</p>
                    <p className="text-sm text-muted-foreground">Use o URL fornecido no painel do provedor</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">4</div>
                  <div>
                    <p className="font-medium">Crie aliases</p>
                    <p className="text-sm text-muted-foreground">Crie emails como apple2024@seudominio.com para cada inscrição</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seeds" className="space-y-4">
          <EmailSeedManager />

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-5 w-5" />
                Integrações Diretas
              </CardTitle>
              <CardDescription>
                Conecte provedores de e-mail via OAuth para acesso simplificado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { name: 'Gmail', description: 'Conectar via conta Google', available: false },
                { name: 'Outlook', description: 'Conectar via conta Microsoft', available: false },
                { name: 'Mailgun', description: 'Integração via API', available: true },
                { name: 'SendGrid', description: 'Integração via Inbound Parse', available: true },
              ].map(provider => (
                <div key={provider.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <span className="font-medium">{provider.name}</span>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                  <Button variant="outline" size="sm" disabled={!provider.available}>
                    {provider.available ? 'Configurar' : 'Em breve'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Alertas</CardTitle>
              <CardDescription>
                Configure como deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas por E-mail</p>
                  <p className="text-sm text-muted-foreground">Receba notificações no seu e-mail</p>
                </div>
                <Button variant="outline" size="sm">Ativar</Button>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertas In-App (Realtime)</p>
                  <p className="text-sm text-muted-foreground">Veja alertas dentro da plataforma em tempo real</p>
                </div>
                <Badge className="bg-success">Ativo</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Novos E-mails Detectados</p>
                  <p className="text-sm text-muted-foreground">Notificar quando newsletters são capturadas</p>
                </div>
                <Badge className="bg-success">Ativo</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Membros da Equipe</CardTitle>
              <CardDescription>
                Convide membros e gerencie permissões
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Funcionalidade de convites em breve</p>
                <Button variant="outline">Convidar Membro</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {['Basic', 'Pro', 'Enterprise'].map(plan => (
              <Card key={plan} className={plan === 'Pro' ? 'border-primary' : ''}>
                <CardHeader>
                  <CardTitle>{plan}</CardTitle>
                  {plan === 'Pro' && <Badge>Plano Atual</Badge>}
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold mb-4">
                    {plan === 'Basic' ? 'R$ 99' : plan === 'Pro' ? 'R$ 299' : 'Sob consulta'}
                    <span className="text-sm font-normal text-muted-foreground">/mês</span>
                  </p>
                  <Button variant={plan === 'Pro' ? 'default' : 'outline'} className="w-full">
                    {plan === 'Pro' ? 'Plano Atual' : 'Selecionar'}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
