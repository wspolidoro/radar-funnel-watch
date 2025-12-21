import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Mail, Plus, RefreshCw, Trash2, Settings2, CheckCircle, XCircle, Clock, Loader2, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface EmailSeed {
  id: string;
  user_id: string;
  name: string;
  email: string;
  provider: 'gmail' | 'outlook' | 'yahoo' | 'imap_custom';
  imap_host: string | null;
  imap_port: number;
  use_ssl: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

type SeedProvider = 'gmail' | 'outlook' | 'yahoo' | 'imap_custom';

const providerLabels: Record<SeedProvider, string> = {
  gmail: 'Gmail',
  outlook: 'Outlook / Office 365',
  yahoo: 'Yahoo Mail',
  imap_custom: 'IMAP Personalizado',
};

const providerDefaults: Record<SeedProvider, { host: string; port: number }> = {
  gmail: { host: 'imap.gmail.com', port: 993 },
  outlook: { host: 'outlook.office365.com', port: 993 },
  yahoo: { host: 'imap.mail.yahoo.com', port: 993 },
  imap_custom: { host: '', port: 993 },
};

export function EmailSeedManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [selectedSeedId, setSelectedSeedId] = useState<string | null>(null);
  const [syncPassword, setSyncPassword] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [newSeed, setNewSeed] = useState({
    name: '',
    email: '',
    provider: 'gmail' as SeedProvider,
    imap_host: '',
    imap_port: 993,
    use_ssl: true,
  });

  const { data: seeds, isLoading } = useQuery({
    queryKey: ['email-seeds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_seeds')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailSeed[];
    },
  });

  const createSeedMutation = useMutation({
    mutationFn: async (seed: Omit<EmailSeed, 'id' | 'user_id' | 'created_at' | 'updated_at' | 'last_sync_at' | 'is_active'>) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const { data, error } = await supabase
        .from('email_seeds')
        .insert({
          ...seed,
          user_id: user.id,
          imap_host: seed.provider === 'imap_custom' ? seed.imap_host : providerDefaults[seed.provider].host,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-seeds'] });
      setIsAddDialogOpen(false);
      resetForm();
      toast({
        title: 'Conta conectada',
        description: 'Caixa de entrada configurada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao conectar conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteSeedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_seeds')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-seeds'] });
      toast({
        title: 'Conta removida',
        description: 'Caixa de entrada desconectada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao remover conta',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const toggleSeedMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('email_seeds')
        .update({ is_active: isActive })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-seeds'] });
    },
  });

  const handleSync = async () => {
    if (!selectedSeedId || !syncPassword) return;
    
    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('sync-imap', {
        body: { seedId: selectedSeedId, password: syncPassword },
      });

      if (error) throw error;

      toast({
        title: 'Sincronização iniciada',
        description: data.message || 'A conexão foi configurada com sucesso.',
      });
      
      queryClient.invalidateQueries({ queryKey: ['email-seeds'] });
      setIsSyncDialogOpen(false);
      setSyncPassword('');
      setSelectedSeedId(null);
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error.message || 'Não foi possível conectar ao servidor IMAP.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const resetForm = () => {
    setNewSeed({
      name: '',
      email: '',
      provider: 'gmail',
      imap_host: '',
      imap_port: 993,
      use_ssl: true,
    });
  };

  const handleProviderChange = (provider: SeedProvider) => {
    const defaults = providerDefaults[provider];
    setNewSeed({
      ...newSeed,
      provider,
      imap_host: defaults.host,
      imap_port: defaults.port,
    });
  };

  const handleSubmit = () => {
    if (!newSeed.name || !newSeed.email) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios.',
        variant: 'destructive',
      });
      return;
    }

    createSeedMutation.mutate(newSeed);
  };

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contas Conectadas
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="font-medium mb-1">Quando usar?</p>
                  <p className="text-xs">Use contas conectadas quando já tiver um email com newsletters inscritas. O sistema importa automaticamente via IMAP. Ideal para migrar histórico existente.</p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
            <CardDescription>
              Conecte suas caixas de entrada para importar newsletters automaticamente via IMAP
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Conta
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Conectar Caixa de Entrada</DialogTitle>
                <DialogDescription>
                  Conecte uma conta de email para capturar newsletters automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Conta *</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Meu Gmail Principal"
                    value={newSeed.name}
                    onChange={(e) => setNewSeed({ ...newSeed, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seed@exemplo.com"
                    value={newSeed.email}
                    onChange={(e) => setNewSeed({ ...newSeed, email: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="provider">Provedor</Label>
                  <Select
                    value={newSeed.provider}
                    onValueChange={(value) => handleProviderChange(value as SeedProvider)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(providerLabels).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {newSeed.provider === 'imap_custom' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="imap_host">Servidor IMAP *</Label>
                      <Input
                        id="imap_host"
                        placeholder="imap.exemplo.com"
                        value={newSeed.imap_host}
                        onChange={(e) => setNewSeed({ ...newSeed, imap_host: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="imap_port">Porta</Label>
                        <Input
                          id="imap_port"
                          type="number"
                          value={newSeed.imap_port}
                          onChange={(e) => setNewSeed({ ...newSeed, imap_port: parseInt(e.target.value) || 993 })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>SSL/TLS</Label>
                        <div className="flex items-center gap-2 h-10">
                          <Switch
                            checked={newSeed.use_ssl}
                            onCheckedChange={(checked) => setNewSeed({ ...newSeed, use_ssl: checked })}
                          />
                          <span className="text-sm text-muted-foreground">
                            {newSeed.use_ssl ? 'Ativado' : 'Desativado'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-1">ℹ️ Importante</p>
                  <p>Para Gmail, é necessário criar uma "Senha de App" nas configurações de segurança da conta Google.</p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
              <Button onClick={handleSubmit} disabled={createSeedMutation.isPending}>
                  {createSeedMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Conectando...
                    </>
                  ) : (
                    'Conectar Conta'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : seeds && seeds.length > 0 ? (
            <div className="space-y-3">
              {seeds.map((seed) => (
                <div
                  key={seed.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{seed.name}</span>
                        <Badge variant={seed.is_active ? 'default' : 'secondary'}>
                          {seed.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{seed.email}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Settings2 className="h-3 w-3" />
                          {providerLabels[seed.provider]}
                        </span>
                        {seed.last_sync_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Última sync: {format(new Date(seed.last_sync_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={seed.is_active}
                      onCheckedChange={(checked) => toggleSeedMutation.mutate({ id: seed.id, isActive: checked })}
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        setSelectedSeedId(seed.id);
                        setIsSyncDialogOpen(true);
                      }}
                      title="Sincronizar agora"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteSeedMutation.mutate(seed.id)}
                      className="text-destructive hover:text-destructive"
                      title="Remover seed"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Nenhuma conta conectada</p>
              <p className="text-sm">Conecte uma caixa de entrada para importar newsletters automaticamente.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>

      {/* Sync Password Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sincronizar Caixa de Entrada</DialogTitle>
            <DialogDescription>
              Digite a senha do e-mail ou senha de aplicativo para conectar ao servidor IMAP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sync-password">Senha / Senha de App</Label>
              <Input
                id="sync-password"
                type="password"
                placeholder="••••••••"
                value={syncPassword}
                onChange={(e) => setSyncPassword(e.target.value)}
              />
            </div>
            <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
              <p>A senha não será armazenada. Você precisará fornecê-la a cada sincronização manual.</p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsSyncDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSync} disabled={isSyncing || !syncPassword}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}