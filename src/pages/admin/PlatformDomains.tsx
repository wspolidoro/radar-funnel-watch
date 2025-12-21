import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { 
  Globe, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Shield,
  Server
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PlatformDomain {
  id: string;
  domain: string;
  provider: string;
  is_verified: boolean;
  is_active: boolean;
  is_platform_domain: boolean;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export default function PlatformDomains() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [newProvider, setNewProvider] = useState('mailgun');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Fetch all platform domains
  const { data: domains, isLoading } = useQuery({
    queryKey: ['platform-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('is_platform_domain', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PlatformDomain[];
    },
  });

  // Add new domain
  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('email_domains')
        .insert({
          domain: newDomain.trim().toLowerCase(),
          provider: newProvider,
          is_platform_domain: true,
          is_verified: false,
          is_active: true,
          user_id: userData.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Domínio adicionado',
        description: 'O domínio da plataforma foi criado com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      setIsAddOpen(false);
      setNewDomain('');
      setNewProvider('mailgun');
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Toggle verified status
  const toggleVerifiedMutation = useMutation({
    mutationFn: async ({ id, verified }: { id: string; verified: boolean }) => {
      const { error } = await supabase
        .from('email_domains')
        .update({ is_verified: verified, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast({ title: 'Status atualizado' });
    },
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('email_domains')
        .update({ is_active: active, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast({ title: 'Status atualizado' });
    },
  });

  // Delete domain
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_domains')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-domains'] });
      toast({ title: 'Domínio removido' });
      setDeleteConfirm(null);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao remover',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const activeDomains = domains?.filter(d => d.is_active) || [];
  const verifiedDomains = domains?.filter(d => d.is_verified) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Globe className="h-8 w-8" />
            Domínios da Plataforma
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os domínios gratuitos disponíveis para geração de emails de rastreamento
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Domínio
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Total de Domínios
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{domains?.length || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Verificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{verifiedDomains.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-500" />
              Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeDomains.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Domains Table */}
      <Card>
        <CardHeader>
          <CardTitle>Domínios Configurados</CardTitle>
          <CardDescription>
            Estes domínios ficam disponíveis gratuitamente para todos os usuários criarem emails de rastreamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : domains?.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Nenhum domínio configurado</h3>
              <p className="text-muted-foreground mb-4">
                Adicione domínios para os usuários criarem emails de rastreamento gratuitos.
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Domínio
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Domínio</TableHead>
                  <TableHead>Provedor</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Ativo</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {domains?.map(domain => (
                  <TableRow key={domain.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-primary" />
                        {domain.domain}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Server className="h-3 w-3" />
                        {domain.provider}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={domain.is_verified}
                          onCheckedChange={(checked) =>
                            toggleVerifiedMutation.mutate({ id: domain.id, verified: checked })
                          }
                        />
                        {domain.is_verified ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={domain.is_active}
                        onCheckedChange={(checked) =>
                          toggleActiveMutation.mutate({ id: domain.id, active: checked })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {format(new Date(domain.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteConfirm(domain.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Domain Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Domínio da Plataforma</DialogTitle>
            <DialogDescription>
              Adicione um domínio que ficará disponível gratuitamente para todos os usuários.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Domínio</Label>
              <Input
                id="domain"
                placeholder="tracker.meusite.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="provider">Provedor de Email</Label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mailgun">Mailgun</SelectItem>
                  <SelectItem value="sendgrid">SendGrid</SelectItem>
                  <SelectItem value="postmark">Postmark</SelectItem>
                  <SelectItem value="ses">Amazon SES</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Lembre-se:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Configure o DNS do domínio para o provedor escolhido</li>
                <li>Ative o webhook de recebimento para este domínio</li>
                <li>Marque como verificado após confirmar a configuração</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addMutation.mutate()}
              disabled={!newDomain.trim() || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adicionando...
                </>
              ) : (
                'Adicionar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este domínio? Usuários não poderão mais criar emails com ele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirm && deleteMutation.mutate(deleteConfirm)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Excluir'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}