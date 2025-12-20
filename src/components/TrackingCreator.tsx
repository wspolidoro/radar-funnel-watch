import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Plus, Copy, Check, Mail, Globe, Loader2, ArrowRight, Sparkles, Settings } from 'lucide-react';

interface TrackingCreatorProps {
  onTrackingCreated?: () => void;
}

interface EmailDomain {
  id: string;
  domain: string;
  provider: string;
  is_verified: boolean;
  is_active: boolean;
  is_platform_domain: boolean;
}

export const TrackingCreator = ({ onTrackingCreated }: TrackingCreatorProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [name, setName] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [generatedEmail, setGeneratedEmail] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<'input' | 'generated'>('input');
  const [showAddDomain, setShowAddDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');

  // Fetch available domains (platform + user's own)
  const { data: domains, isLoading: domainsLoading } = useQuery({
    queryKey: ['available-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('is_active', true)
        .order('is_platform_domain', { ascending: false });
      
      if (error) throw error;
      return data as EmailDomain[];
    },
    enabled: !!user,
  });

  // Fetch existing aliases to check for duplicates
  const { data: existingAliases } = useQuery({
    queryKey: ['existing-aliases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('alias');
      
      if (error) throw error;
      return data?.map(a => a.alias) || [];
    },
    enabled: !!user,
  });

  // Generate unique identifier
  const generateUniqueIdentifier = (baseName: string): string => {
    const cleanName = baseName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${cleanName}${randomNum}`;
  };

  // Generate email alias
  const handleGenerateEmail = () => {
    if (!name.trim() || !selectedDomain) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o nome e selecione um domínio.',
        variant: 'destructive',
      });
      return;
    }

    let identifier = generateUniqueIdentifier(name);
    let email = `${identifier}@${selectedDomain}`;
    
    // Ensure uniqueness
    let attempts = 0;
    while (existingAliases?.includes(email) && attempts < 10) {
      identifier = generateUniqueIdentifier(name);
      email = `${identifier}@${selectedDomain}`;
      attempts++;
    }

    setGeneratedEmail(email);
    setStep('generated');
  };

  // Create tracking mutation
  const createTrackingMutation = useMutation({
    mutationFn: async () => {
      if (!user || !generatedEmail) throw new Error('Dados inválidos');

      const [localPart, domain] = generatedEmail.split('@');
      
      const { data, error } = await supabase
        .from('email_aliases')
        .insert({
          user_id: user.id,
          name: name.trim(),
          alias: generatedEmail,
          local_part: localPart,
          domain: domain,
          description: `Rastreamento: ${name}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: 'Rastreamento criado!',
        description: `O email ${generatedEmail} está sendo monitorado.`,
      });
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      queryClient.invalidateQueries({ queryKey: ['existing-aliases'] });
      
      // Reset form
      setName('');
      setSelectedDomain('');
      setGeneratedEmail('');
      setStep('input');
      setCopied(false);
      
      onTrackingCreated?.();
    },
    onError: (error) => {
      console.error('Error creating tracking:', error);
      toast({
        title: 'Erro ao criar rastreamento',
        description: 'Não foi possível criar o rastreamento. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async () => {
    if (!generatedEmail) return;
    
    try {
      await navigator.clipboard.writeText(generatedEmail);
      setCopied(true);
      toast({
        title: 'Copiado!',
        description: 'Email copiado para a área de transferência.',
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o email.',
        variant: 'destructive',
      });
    }
  };

  // Add custom domain mutation
  const addDomainMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newDomain.trim()) throw new Error('Dados inválidos');

      const { data, error } = await supabase
        .from('email_domains')
        .insert({
          user_id: user.id,
          domain: newDomain.trim().toLowerCase(),
          provider: 'custom',
          is_verified: false,
          is_active: true,
          is_platform_domain: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Domínio adicionado!',
        description: 'Configure o DNS para ativar o recebimento de emails.',
      });
      queryClient.invalidateQueries({ queryKey: ['available-domains'] });
      setSelectedDomain(data.domain);
      setNewDomain('');
      setShowAddDomain(false);
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro ao adicionar domínio',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const platformDomains = domains?.filter(d => d.is_platform_domain) || [];
  const userDomains = domains?.filter(d => !d.is_platform_domain) || [];

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Novo Rastreamento
        </CardTitle>
        <CardDescription>
          Crie um email único para monitorar newsletters de qualquer empresa
        </CardDescription>
      </CardHeader>
      <CardContent>
        {step === 'input' ? (
          <div className="space-y-4">
            {/* Step 1: Name */}
            <div className="space-y-2">
              <Label htmlFor="tracking-name">Nome da Empresa/Newsletter</Label>
              <Input
                id="tracking-name"
                placeholder="Ex: Apple, Nubank, Newsletter da Hotmart..."
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Step 2: Select Domain */}
            <div className="space-y-2">
              <Label>Selecionar Domínio</Label>
              <Select value={selectedDomain} onValueChange={setSelectedDomain}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um domínio para o email" />
                </SelectTrigger>
                <SelectContent>
                  {platformDomains.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        Domínios da Plataforma
                      </div>
                      {platformDomains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            {domain.domain}
                            <Badge variant="secondary" className="text-xs">Gratuito</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}
                  
                  {userDomains.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mt-2">
                        Seus Domínios
                      </div>
                      {userDomains.map((domain) => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {domain.domain}
                            {domain.is_verified && (
                              <Badge variant="outline" className="text-xs text-success border-success">
                                Verificado
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </>
                  )}

                  {domainsLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}

                  {!domainsLoading && domains?.length === 0 && (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      Nenhum domínio disponível
                    </div>
                  )}

                  {/* Add custom domain option */}
                  <div className="border-t mt-2 pt-2">
                    <button
                      type="button"
                      className="w-full px-2 py-2 text-left text-sm hover:bg-muted rounded-md flex items-center gap-2 text-primary"
                      onClick={() => setShowAddDomain(true)}
                    >
                      <Plus className="h-4 w-4" />
                      Adicionar meu domínio
                    </button>
                  </div>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <Button 
              onClick={handleGenerateEmail}
              disabled={!name.trim() || !selectedDomain}
              className="w-full gap-2"
            >
              Gerar Email de Rastreamento
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Generated Email Display */}
            <div className="p-4 bg-muted rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Email gerado para "{name}":</span>
                <Badge variant="outline">Pronto para usar</Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-background rounded-md border font-mono text-sm break-all">
                  {generatedEmail}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="p-4 border rounded-lg bg-primary/5">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Como usar
              </h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Copie o email acima</li>
                <li>Inscreva-se na newsletter que deseja monitorar</li>
                <li>Clique em "Salvar Rastreamento"</li>
                <li>Os emails serão capturados automaticamente</li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setStep('input');
                  setGeneratedEmail('');
                }}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                onClick={() => createTrackingMutation.mutate()}
                disabled={createTrackingMutation.isPending}
                className="flex-1 gap-2"
              >
                {createTrackingMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Salvar Rastreamento
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Add Domain Dialog */}
      <Dialog open={showAddDomain} onOpenChange={setShowAddDomain}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Adicionar Domínio Próprio
            </DialogTitle>
            <DialogDescription>
              Use seu próprio domínio para receber emails de rastreamento.
              Você precisará configurar o DNS após adicionar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-domain">Domínio</Label>
              <Input
                id="new-domain"
                placeholder="meudominio.com.br"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
            </div>

            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-2">Após adicionar, você precisará:</p>
              <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                <li>Configurar registros MX no DNS</li>
                <li>Verificar a propriedade do domínio</li>
                <li>Aguardar propagação (até 48h)</li>
              </ol>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDomain(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => addDomainMutation.mutate()}
              disabled={!newDomain.trim() || addDomainMutation.isPending}
            >
              {addDomainMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Adicionando...
                </>
              ) : (
                'Adicionar Domínio'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
