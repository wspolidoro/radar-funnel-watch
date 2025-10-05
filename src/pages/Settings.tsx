import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Users, Bell, CreditCard } from 'lucide-react';
import { RoleGuard } from '@/components/RoleGuard';

const Settings = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seeds, integrações, alertas e equipe
        </p>
      </div>

      <Tabs defaultValue="seeds" className="space-y-6">
        <TabsList>
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

        <TabsContent value="seeds" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>E-mails Seed</CardTitle>
              <CardDescription>
                E-mails configurados para receber newsletters dos concorrentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">Configure seus e-mails seed no onboarding</p>
                <Button variant="outline">Adicionar Seed</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Integrações</CardTitle>
              <CardDescription>
                Conecte provedores de e-mail para coletar mensagens automaticamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {['Gmail', 'Outlook', 'Mailgun', 'SendGrid'].map(provider => (
                <div key={provider} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="font-medium">{provider}</span>
                  <Button variant="outline" size="sm">Conectar</Button>
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
                  <p className="font-medium">Alertas In-App</p>
                  <p className="text-sm text-muted-foreground">Veja alertas dentro da plataforma</p>
                </div>
                <Badge>Ativo</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="team" className="space-y-4">
          <RoleGuard allowedRoles={['owner', 'admin']}>
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
          </RoleGuard>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <RoleGuard allowedRoles={['owner']}>
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
          </RoleGuard>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
