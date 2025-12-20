import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Zap, Copy, Check, Mail, ExternalLink, Plus, Loader2, Inbox } from 'lucide-react';

interface QuickAliasGeneratorProps {
  onAliasCreated?: () => void;
}

export function QuickAliasGenerator({ onAliasCreated }: QuickAliasGeneratorProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [aliasName, setAliasName] = useState('');
  const [selectedSeedId, setSelectedSeedId] = useState<string>('');
  const [generatedAlias, setGeneratedAlias] = useState('');

  const { data: seeds, isLoading: loadingSeeds } = useQuery({
    queryKey: ['email-seeds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_seeds')
        .select('id, name, email')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const { data: pendingAliases, refetch: refetchPending } = useQuery({
    queryKey: ['pending-aliases'],
    queryFn: async () => {
      // Get seeds that have no newsletters yet (pending first email)
      const { data: seedsData, error: seedsError } = await supabase
        .from('email_seeds')
        .select('id, name, email, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (seedsError) throw seedsError;

      // Get seeds that already have newsletters
      const { data: newsletters, error: newsError } = await supabase
        .from('captured_newsletters')
        .select('seed_id');
      
      if (newsError) throw newsError;

      const seedsWithNewsletters = new Set(newsletters?.map(n => n.seed_id) || []);
      
      // Filter seeds that don't have any newsletters yet
      return seedsData?.filter(seed => !seedsWithNewsletters.has(seed.id)) || [];
    },
  });

  const generateAlias = () => {
    if (!selectedSeedId || !seeds) return;
    
    const seed = seeds.find(s => s.id === selectedSeedId);
    if (!seed) return;

    const [localPart, domain] = seed.email.split('@');
    const identifier = aliasName.toLowerCase().replace(/[^a-z0-9]/g, '') || 
      `track${Date.now().toString(36)}`;
    
    // Gmail-style alias: user+alias@domain.com
    const alias = `${localPart}+${identifier}@${domain}`;
    setGeneratedAlias(alias);
  };

  const createQuickSeedMutation = useMutation({
    mutationFn: async (data: { name: string; email: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Não autenticado');

      // Detect provider from email domain
      const domain = data.email.split('@')[1]?.toLowerCase();
      let provider = 'imap_custom';
      let imap_host = '';
      
      if (domain?.includes('gmail')) {
        provider = 'gmail';
        imap_host = 'imap.gmail.com';
      } else if (domain?.includes('outlook') || domain?.includes('hotmail') || domain?.includes('live')) {
        provider = 'outlook';
        imap_host = 'outlook.office365.com';
      } else if (domain?.includes('yahoo')) {
        provider = 'yahoo';
        imap_host = 'imap.mail.yahoo.com';
      }

      const { data: seedData, error } = await supabase
        .from('email_seeds')
        .insert({
          name: data.name,
          email: data.email,
          user_id: user.id,
          provider,
          imap_host,
          imap_port: 993,
          use_ssl: true,
        })
        .select()
        .single();
      
      if (error) throw error;
      return seedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-seeds'] });
      queryClient.invalidateQueries({ queryKey: ['pending-aliases'] });
      toast({
        title: 'Rastreamento criado!',
        description: 'Use o e-mail gerado para se inscrever na newsletter.',
      });
      setIsOpen(false);
      resetForm();
      onAliasCreated?.();
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar rastreamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedAlias);
    setCopied(true);
    toast({
      title: 'Copiado!',
      description: 'E-mail copiado para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateTracking = () => {
    if (!generatedAlias || !aliasName) {
      toast({
        title: 'Dados incompletos',
        description: 'Preencha o nome do rastreamento.',
        variant: 'destructive',
      });
      return;
    }

    createQuickSeedMutation.mutate({
      name: aliasName,
      email: generatedAlias,
    });
  };

  const resetForm = () => {
    setAliasName('');
    setSelectedSeedId('');
    setGeneratedAlias('');
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              Rastreamento Rápido
            </CardTitle>
            <CardDescription>
              Gere um e-mail alias para assinar newsletters e acompanhá-las
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Rastreamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Rastreamento Rápido</DialogTitle>
                <DialogDescription>
                  Gere um e-mail alias para se inscrever em uma newsletter e acompanhá-la automaticamente.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Rastreamento *</Label>
                  <Input
                    placeholder="Ex: Newsletter TechCrunch"
                    value={aliasName}
                    onChange={(e) => setAliasName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>E-mail Base</Label>
                  <Select value={selectedSeedId} onValueChange={setSelectedSeedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um e-mail seed" />
                    </SelectTrigger>
                    <SelectContent>
                      {loadingSeeds ? (
                        <div className="p-2 text-center">
                          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                        </div>
                      ) : seeds && seeds.length > 0 ? (
                        seeds.map((seed) => (
                          <SelectItem key={seed.id} value={seed.id}>
                            {seed.name} ({seed.email})
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-muted-foreground text-sm">
                          Nenhum e-mail seed ativo
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  variant="outline" 
                  onClick={generateAlias}
                  disabled={!selectedSeedId || !aliasName}
                  className="w-full gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Gerar E-mail Alias
                </Button>

                {generatedAlias && (
                  <div className="space-y-2">
                    <Label>E-mail Gerado</Label>
                    <div className="flex gap-2">
                      <Input
                        value={generatedAlias}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyToClipboard}
                      >
                        {copied ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Use este e-mail para se inscrever na newsletter. Os e-mails serão capturados automaticamente.
                    </p>
                  </div>
                )}

                <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                  <p className="font-medium mb-1">💡 Como funciona:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Copie o e-mail alias gerado</li>
                    <li>Use-o para se inscrever na newsletter</li>
                    <li>O primeiro e-mail recebido ativa o rastreamento</li>
                    <li>Acompanhe todas as mensagens no painel</li>
                  </ol>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsOpen(false); resetForm(); }}>
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateTracking} 
                  disabled={!generatedAlias || createQuickSeedMutation.isPending}
                >
                  {createQuickSeedMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Criando...
                    </>
                  ) : (
                    'Criar Rastreamento'
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {pendingAliases && pendingAliases.length > 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-2">
                Rastreamentos aguardando primeiro e-mail:
              </p>
              {pendingAliases.map((alias) => (
                <div
                  key={alias.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Inbox className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div>
                      <span className="font-medium text-sm">{alias.name}</span>
                      <p className="text-xs text-muted-foreground">{alias.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                    Aguardando
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Zap className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhum rastreamento pendente</p>
              <p className="text-xs mt-1">Crie um novo para começar a acompanhar newsletters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
