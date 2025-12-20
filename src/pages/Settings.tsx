import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Mail, Users, Bell, CreditCard, Plug, User, Globe, Sparkles, 
  Key, Coins, History, Eye, EyeOff, Loader2, Check
} from 'lucide-react';
import { EmailSeedManager } from '@/components/EmailSeedManager';
import { ProfileSettings } from '@/components/ProfileSettings';
import { DomainManager } from '@/components/DomainManager';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [useOwnGpt, setUseOwnGpt] = useState(false);

  // Fetch profile with AI settings
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-ai-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch AI usage logs
  const { data: usageLogs } = useQuery({
    queryKey: ['ai-usage-logs', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from('ai_usage_log')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id
  });

  useEffect(() => {
    if (profile) {
      setApiKey(profile.gpt_api_key || '');
      setUseOwnGpt(profile.use_own_gpt || false);
    }
  }, [profile]);

  // Update AI settings mutation
  const updateAiSettings = useMutation({
    mutationFn: async ({ gpt_api_key, use_own_gpt }: { gpt_api_key: string; use_own_gpt: boolean }) => {
      if (!user?.id) throw new Error('User not found');
      const { error } = await supabase
        .from('profiles')
        .update({ gpt_api_key, use_own_gpt })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile-ai-settings'] });
      toast.success('Configurações de IA atualizadas');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar configurações: ' + error.message);
    }
  });

  const handleSaveAiSettings = () => {
    updateAiSettings.mutate({ gpt_api_key: apiKey, use_own_gpt: useOwnGpt });
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      'analyze_newsletter': 'Análise de Newsletter',
      'generate_report': 'Geração de Relatório',
      'chat_insights': 'Chat com IA',
      'detect_funnels': 'Detecção de Funis',
      'categorize': 'Categorização'
    };
    return labels[action] || action;
  };

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
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Inteligência Artificial
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

        <TabsContent value="ai" className="space-y-4">
          {/* AI Credits Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                Créditos de IA
              </CardTitle>
              <CardDescription>
                Use créditos do seu plano ou conecte seu próprio token GPT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profileLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Credits Display */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-muted-foreground">Créditos disponíveis</p>
                        <p className="text-3xl font-bold">{profile?.ai_credits || 0}</p>
                      </div>
                      <Coins className="h-10 w-10 text-muted-foreground" />
                    </div>
                  </div>

                  {/* Toggle Own GPT */}
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <Label className="font-medium">Usar token GPT próprio</Label>
                      <p className="text-sm text-muted-foreground">
                        {useOwnGpt 
                          ? 'Você está usando sua própria API Key do OpenAI' 
                          : 'Usando créditos do plano RadarMail'}
                      </p>
                    </div>
                    <Switch 
                      checked={useOwnGpt} 
                      onCheckedChange={setUseOwnGpt}
                    />
                  </div>

                  {/* API Key Input */}
                  {useOwnGpt && (
                    <div className="space-y-3">
                      <Label htmlFor="api-key" className="flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        OpenAI API Key
                      </Label>
                      <div className="relative">
                        <Input
                          id="api-key"
                          type={showApiKey ? 'text' : 'password'}
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="sk-..."
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Sua API Key é criptografada e armazenada de forma segura
                      </p>
                    </div>
                  )}

                  {/* Save Button */}
                  <Button 
                    onClick={handleSaveAiSettings}
                    disabled={updateAiSettings.isPending}
                    className="w-full"
                  >
                    {updateAiSettings.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Salvar Configurações
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Usage History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Uso
              </CardTitle>
              <CardDescription>
                Últimas 20 operações de IA realizadas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageLogs && usageLogs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead className="text-right">Créditos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(log.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>{getActionLabel(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.model_used || 'N/A'}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          -{log.credits_used}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <History className="h-10 w-10 mx-auto mb-3 opacity-50" />
                  <p>Nenhum uso de IA registrado ainda</p>
                </div>
              )}
            </CardContent>
          </Card>
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
