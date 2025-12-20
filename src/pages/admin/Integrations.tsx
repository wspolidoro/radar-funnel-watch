import { useState } from 'react';
import { 
  Blocks, 
  Check,
  X,
  ExternalLink,
  Settings,
  Zap,
  Mail,
  CreditCard,
  MessageSquare,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  category: 'payment' | 'email' | 'analytics' | 'communication';
  isEnabled: boolean;
  isConfigured: boolean;
  configFields: { key: string; label: string; type: 'text' | 'password'; value: string }[];
}

const initialIntegrations: Integration[] = [
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Processamento de pagamentos e assinaturas',
    icon: CreditCard,
    category: 'payment',
    isEnabled: true,
    isConfigured: true,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', value: 'sk_live_***' },
      { key: 'webhook_secret', label: 'Webhook Secret', type: 'password', value: 'whsec_***' }
    ]
  },
  {
    id: 'mailgun',
    name: 'Mailgun',
    description: 'Recebimento de emails via webhook',
    icon: Mail,
    category: 'email',
    isEnabled: true,
    isConfigured: true,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', value: 'key-***' },
      { key: 'domain', label: 'Domínio', type: 'text', value: 'mail.newsletterspy.io' }
    ]
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    description: 'Envio de emails transacionais',
    icon: Mail,
    category: 'email',
    isEnabled: false,
    isConfigured: false,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', value: '' }
    ]
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Notificações e alertas em tempo real',
    icon: MessageSquare,
    category: 'communication',
    isEnabled: false,
    isConfigured: false,
    configFields: [
      { key: 'webhook_url', label: 'Webhook URL', type: 'text', value: '' }
    ]
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Analytics e tracking de eventos',
    icon: BarChart3,
    category: 'analytics',
    isEnabled: false,
    isConfigured: false,
    configFields: [
      { key: 'project_token', label: 'Project Token', type: 'text', value: '' }
    ]
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'Análise de conteúdo com IA',
    icon: Zap,
    category: 'analytics',
    isEnabled: true,
    isConfigured: true,
    configFields: [
      { key: 'api_key', label: 'API Key', type: 'password', value: 'sk-***' }
    ]
  }
];

const categoryLabels = {
  payment: 'Pagamentos',
  email: 'Email',
  analytics: 'Analytics',
  communication: 'Comunicação'
};

export default function AdminIntegrations() {
  const [integrations, setIntegrations] = useState<Integration[]>(initialIntegrations);
  const [configuring, setConfiguring] = useState<Integration | null>(null);
  const [formData, setFormData] = useState<Record<string, string>>({});

  const handleToggle = (integrationId: string) => {
    setIntegrations(integrations.map(i => {
      if (i.id === integrationId) {
        if (!i.isConfigured && !i.isEnabled) {
          // Se não está configurado, abre o dialog de configuração
          setConfiguring(i);
          const initialData: Record<string, string> = {};
          i.configFields.forEach(f => { initialData[f.key] = f.value; });
          setFormData(initialData);
          return i;
        }
        return { ...i, isEnabled: !i.isEnabled };
      }
      return i;
    }));
  };

  const handleConfigure = (integration: Integration) => {
    setConfiguring(integration);
    const initialData: Record<string, string> = {};
    integration.configFields.forEach(f => { initialData[f.key] = f.value; });
    setFormData(initialData);
  };

  const handleSaveConfig = () => {
    if (!configuring) return;

    setIntegrations(integrations.map(i => {
      if (i.id === configuring.id) {
        return {
          ...i,
          isConfigured: true,
          isEnabled: true,
          configFields: i.configFields.map(f => ({
            ...f,
            value: formData[f.key] || f.value
          }))
        };
      }
      return i;
    }));

    toast({ 
      title: 'Integração configurada', 
      description: `${configuring.name} foi configurado com sucesso.` 
    });
    setConfiguring(null);
  };

  const groupedIntegrations = integrations.reduce((acc, integration) => {
    if (!acc[integration.category]) {
      acc[integration.category] = [];
    }
    acc[integration.category].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Blocks className="h-8 w-8 text-primary" />
            Integrações
          </h1>
          <p className="text-muted-foreground">
            Configure conexões com serviços externos
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Integrações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{integrations.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {integrations.filter(i => i.isEnabled).length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pendentes de Configuração
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {integrations.filter(i => !i.isConfigured).length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Integrations by Category */}
      {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-semibold">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryIntegrations.map((integration) => {
              const Icon = integration.icon;
              return (
                <Card key={integration.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{integration.name}</CardTitle>
                          <CardDescription className="text-xs">
                            {integration.description}
                          </CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={integration.isEnabled}
                        onCheckedChange={() => handleToggle(integration.id)}
                      />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {integration.isConfigured ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700 border-green-500/20">
                            <Check className="h-3 w-3 mr-1" />
                            Configurado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                            <X className="h-3 w-3 mr-1" />
                            Não configurado
                          </Badge>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfigure(integration)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}

      {/* Configuration Dialog */}
      <Dialog open={!!configuring} onOpenChange={() => setConfiguring(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {configuring && <configuring.icon className="h-5 w-5" />}
              Configurar {configuring?.name}
            </DialogTitle>
            <DialogDescription>
              Insira as credenciais para conectar com {configuring?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {configuring?.configFields.map((field) => (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>{field.label}</Label>
                <Input
                  id={field.key}
                  type={field.type}
                  value={formData[field.key] || ''}
                  onChange={(e) => setFormData({ ...formData, [field.key]: e.target.value })}
                  placeholder={`Insira ${field.label.toLowerCase()}`}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfiguring(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveConfig}>
              Salvar Configuração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}