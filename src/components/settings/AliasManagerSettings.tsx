import { useState, useMemo } from 'react';
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
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Plus, Copy, Mail, CheckCircle, Clock, Trash2, ExternalLink, Loader2, Search, MailCheck, MailX, Inbox } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailAlias {
  id: string;
  alias: string;
  local_part: string;
  domain: string;
  name: string | null;
  description: string | null;
  sender_name: string | null;
  sender_category: string | null;
  is_confirmed: boolean;
  first_email_at: string | null;
  email_count: number;
  created_at: string;
}

interface EmailDomain {
  id: string;
  domain: string;
  provider: string;
  is_verified: boolean;
  is_active: boolean;
}

interface AliasStats {
  total: number;
  active: number;
  inactive: number;
  totalEmails: number;
}

export function AliasManagerSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [localPart, setLocalPart] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('');
  const [aliasName, setAliasName] = useState('');
  const [aliasDescription, setAliasDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch domains
  const { data: domains = [] } = useQuery({
    queryKey: ['email-domains', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailDomain[];
    },
    enabled: !!user,
  });

  // Fetch aliases
  const { data: aliases = [], isLoading } = useQuery({
    queryKey: ['email-aliases', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailAlias[];
    },
    enabled: !!user,
  });

  // Calculate stats
  const stats: AliasStats = useMemo(() => {
    if (!aliases.length) return { total: 0, active: 0, inactive: 0, totalEmails: 0 };
    
    return aliases.reduce((acc, alias) => ({
      total: acc.total + 1,
      active: acc.active + (alias.is_confirmed ? 1 : 0),
      inactive: acc.inactive + (alias.is_confirmed ? 0 : 1),
      totalEmails: acc.totalEmails + (alias.email_count || 0),
    }), { total: 0, active: 0, inactive: 0, totalEmails: 0 });
  }, [aliases]);

  // Filter aliases based on search
  const filteredAliases = useMemo(() => {
    if (!searchQuery.trim()) return aliases;
    
    const query = searchQuery.toLowerCase();
    return aliases.filter(alias => 
      alias.alias.toLowerCase().includes(query) ||
      alias.name?.toLowerCase().includes(query) ||
      alias.sender_name?.toLowerCase().includes(query) ||
      alias.description?.toLowerCase().includes(query)
    );
  }, [aliases, searchQuery]);

  // Create alias mutation
  const createAliasMutation = useMutation({
    mutationFn: async () => {
      if (!localPart || !selectedDomain) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      const alias = `${localPart}@${selectedDomain}`;

      const { data, error } = await supabase
        .from('email_aliases')
        .insert({
          user_id: user?.id,
          alias,
          local_part: localPart,
          domain: selectedDomain,
          name: aliasName || localPart,
          description: aliasDescription || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      toast.success('Alias criado com sucesso!', {
        description: `Use ${data.alias} para se inscrever em newsletters`,
      });
      setIsOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar alias', { description: error.message });
    },
  });

  // Delete alias mutation
  const deleteAliasMutation = useMutation({
    mutationFn: async (aliasId: string) => {
      const { error } = await supabase
        .from('email_aliases')
        .delete()
        .eq('id', aliasId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      toast.success('Alias removido');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover alias', { description: error.message });
    },
  });

  // Toggle alias active status (using is_confirmed as proxy for active status)
  const toggleAliasMutation = useMutation({
    mutationFn: async ({ aliasId, isActive }: { aliasId: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('email_aliases')
        .update({ is_confirmed: isActive })
        .eq('id', aliasId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      toast.success('Status do alias atualizado');
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar alias', { description: error.message });
    },
  });

  const resetForm = () => {
    setLocalPart('');
    setSelectedDomain('');
    setAliasName('');
    setAliasDescription('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Email copiado!');
  };

  const getStatusBadge = (alias: EmailAlias) => {
    if (!alias.is_confirmed && alias.email_count === 0) {
      return <Badge variant="outline" className="text-muted-foreground"><Clock className="w-3 h-3 mr-1" /> Aguardando</Badge>;
    }
    if (alias.email_count > 0 && alias.is_confirmed) {
      return <Badge variant="default" className="bg-success"><CheckCircle className="w-3 h-3 mr-1" /> Ativo</Badge>;
    }
    if (alias.email_count > 0) {
      return <Badge variant="secondary"><Mail className="w-3 h-3 mr-1" /> Recebendo</Badge>;
    }
    return <Badge variant="outline"><Clock className="w-3 h-3 mr-1" /> Inativo</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Aliases de Email
          </CardTitle>
          <CardDescription>
            Gerencie seus emails de rastreamento para newsletters
          </CardDescription>
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button disabled={domains.length === 0}>
              <Plus className="w-4 h-4 mr-2" />
              Novo Alias
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Alias</DialogTitle>
              <DialogDescription>
                Crie um email único para rastrear uma newsletter específica
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="localPart">Identificador</Label>
                  <Input
                    id="localPart"
                    placeholder="apple2024"
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="domain">Domínio</Label>
                  <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      {domains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          @{domain.domain}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {localPart && selectedDomain && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Email que será criado:</p>
                  <p className="font-mono font-medium">{localPart}@{selectedDomain}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nome (opcional)</Label>
                <Input
                  id="name"
                  placeholder="Newsletter da Apple"
                  value={aliasName}
                  onChange={(e) => setAliasName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Novidades e lançamentos de produtos"
                  value={aliasDescription}
                  onChange={(e) => setAliasDescription(e.target.value)}
                />
              </div>

              <Button
                onClick={() => createAliasMutation.mutate()}
                disabled={!localPart || !selectedDomain || createAliasMutation.isPending}
                className="w-full"
              >
                {createAliasMutation.isPending ? 'Criando...' : 'Criar Alias'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stats Cards */}
        {aliases.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Mail className="h-4 w-4" />
                <span className="text-xs font-medium">Total</span>
              </div>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="p-3 bg-success/10 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 text-success mb-1">
                <MailCheck className="h-4 w-4" />
                <span className="text-xs font-medium">Ativos</span>
              </div>
              <p className="text-2xl font-bold text-success">{stats.active}</p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MailX className="h-4 w-4" />
                <span className="text-xs font-medium">Inativos</span>
              </div>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Inbox className="h-4 w-4" />
                <span className="text-xs font-medium">Emails</span>
              </div>
              <p className="text-2xl font-bold text-primary">{stats.totalEmails}</p>
            </div>
          </div>
        )}

        {/* Search Field */}
        {aliases.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email, nome, remetente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        {/* Aliases List */}
        {domains.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum domínio configurado</p>
            <p className="text-sm">Configure um domínio na aba "Domínios" para criar aliases</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : aliases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alias criado ainda</p>
            <p className="text-sm">Clique em "Novo Alias" para começar</p>
          </div>
        ) : filteredAliases.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum alias encontrado</p>
            <p className="text-sm">Tente outro termo de busca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredAliases.map((alias) => (
              <div
                key={alias.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-medium truncate">{alias.alias}</span>
                    <button
                      onClick={() => copyToClipboard(alias.alias)}
                      className="p-1 hover:bg-muted rounded"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                    {getStatusBadge(alias)}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                    {alias.name && <span>{alias.name}</span>}
                    {alias.sender_name && (
                      <span className="flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" />
                        {alias.sender_name}
                      </span>
                    )}
                    <span>{alias.email_count} emails</span>
                    {alias.first_email_at && (
                      <span>
                        Primeiro: {format(new Date(alias.first_email_at), "dd 'de' MMM", { locale: ptBR })}
                      </span>
                    )}
                    <span>
                      Criado: {format(new Date(alias.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`toggle-${alias.id}`} className="text-sm text-muted-foreground sr-only">
                      Ativo
                    </Label>
                    <Switch
                      id={`toggle-${alias.id}`}
                      checked={alias.is_confirmed}
                      onCheckedChange={(checked) => 
                        toggleAliasMutation.mutate({ aliasId: alias.id, isActive: checked })
                      }
                      disabled={toggleAliasMutation.isPending}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteAliasMutation.mutate(alias.id)}
                    disabled={deleteAliasMutation.isPending}
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
