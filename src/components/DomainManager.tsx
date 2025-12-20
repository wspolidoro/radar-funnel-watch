import { useState } from 'react';
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
import { Plus, Globe, CheckCircle, AlertCircle, Trash2, Copy, Info } from 'lucide-react';

interface EmailDomain {
  id: string;
  domain: string;
  provider: string;
  is_verified: boolean;
  is_active: boolean;
  webhook_secret: string | null;
  created_at: string;
}

export function DomainManager() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [domain, setDomain] = useState('');
  const [provider, setProvider] = useState('mailgun');

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

      const cleanDomain = domain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');

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
        description: 'Configure o webhook no seu provedor de email',
      });
      setIsOpen(false);
      setDomain('');
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar domínio', { description: error.message });
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Domínios de Email</CardTitle>
          <CardDescription>
            Configure domínios para receber emails via webhook
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Domínio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Domínio</DialogTitle>
              <DialogDescription>
                Configure um domínio para receber emails via Mailgun ou SendGrid
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="domain">Domínio</Label>
                  <Input
                    id="domain"
                    placeholder="emails.seudominio.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider">Provedor</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Configuração do Webhook</AlertTitle>
                <AlertDescription className="mt-2">
                  <p className="mb-2">Configure este URL no seu provedor ({provider === 'mailgun' ? 'Mailgun' : 'SendGrid'}):</p>
                  <div className="flex items-center gap-2 p-2 bg-muted rounded font-mono text-sm">
                    <span className="truncate flex-1">{webhookUrl}</span>
                    <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookUrl)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  {provider === 'mailgun' && (
                    <p className="mt-2 text-sm">
                      No Mailgun: Routes → Create Route → Match Recipient: <code>.*@{domain || 'seudominio.com'}</code> → Forward → URL acima
                    </p>
                  )}
                  {provider === 'sendgrid' && (
                    <p className="mt-2 text-sm">
                      No SendGrid: Settings → Inbound Parse → Add Host & URL → Domain: <code>{domain || 'seudominio.com'}</code> → URL acima
                    </p>
                  )}
                </AlertDescription>
              </Alert>

              <Button
                onClick={() => createDomainMutation.mutate()}
                disabled={!domain || createDomainMutation.isPending}
                className="w-full"
              >
                {createDomainMutation.isPending ? 'Adicionando...' : 'Adicionar Domínio'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : domains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Globe className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum domínio configurado</p>
            <p className="text-sm">Adicione um domínio para criar aliases personalizados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {domains.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Globe className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{d.domain}</span>
                      {d.is_verified ? (
                        <Badge variant="default" className="bg-success">
                          <CheckCircle className="w-3 h-3 mr-1" /> Verificado
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <AlertCircle className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )}
                      {!d.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Provedor: {d.provider === 'mailgun' ? 'Mailgun' : 'SendGrid'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleDomainMutation.mutate({ id: d.id, isActive: !d.is_active })}
                  >
                    {d.is_active ? 'Desativar' : 'Ativar'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteDomainMutation.mutate(d.id)}
                    disabled={deleteDomainMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
