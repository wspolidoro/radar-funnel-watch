import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Step 1: Tracking Name
  const [trackingName, setTrackingName] = useState('');
  
  // Step 2: Domain Selection
  const [selectedDomain, setSelectedDomain] = useState('');

  // Fetch available domains
  const { data: domains } = useQuery({
    queryKey: ['onboarding-domains'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('is_active', true)
        .eq('is_platform_domain', true)
        .order('domain');
      
      if (error) throw error;
      return data || [];
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

  // Create tracking email mutation
  const createTrackingMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Não autenticado');
      
      const localPart = generateUniqueIdentifier(trackingName);
      const alias = `${localPart}@${selectedDomain}`;
      
      const { data, error } = await supabase
        .from('email_aliases')
        .insert({
          user_id: user.id,
          name: trackingName.trim(),
          alias: alias,
          local_part: localPart,
          domain: selectedDomain,
          description: `Primeiro rastreamento: ${trackingName}`,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Email de rastreamento criado!',
        description: `Use ${data.alias} para se inscrever em newsletters.`
      });
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      navigate('/senders');
    },
    onError: (error) => {
      toast({ 
        title: 'Erro',
        description: 'Algo deu errado. Tente novamente.',
        variant: 'destructive'
      });
      console.error(error);
    },
  });

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        if (!trackingName.trim()) {
          toast({ 
            title: 'Nome obrigatório',
            description: 'Informe o nome da newsletter ou empresa.',
            variant: 'destructive'
          });
          return;
        }
        setStep(2);
      } else if (step === 2) {
        if (!selectedDomain) {
          toast({ 
            title: 'Domínio obrigatório',
            description: 'Selecione um domínio para o email.',
            variant: 'destructive'
          });
          return;
        }
        await createTrackingMutation.mutateAsync();
      }
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return trackingName.trim().length > 0;
    if (step === 2) return selectedDomain.length > 0;
    return false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-background">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2].map(num => (
              <div key={num} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-base ${
                  step >= num ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                }`}>
                  {step > num ? <CheckCircle2 className="h-5 w-5" /> : num}
                </div>
                {num < 2 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step > num ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Identificar Newsletter</span>
            <span>Criar Email de Rastreamento</span>
          </div>
        </div>

        {/* Steps */}
        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Qual newsletter você quer monitorar?
                </CardTitle>
                <CardDescription>
                  Informe o nome da empresa ou newsletter que deseja rastrear
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Newsletter ou Empresa</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Apple, Nubank, Newsletter do João..."
                    value={trackingName}
                    onChange={(e) => setTrackingName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">O que acontece depois?</h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Vamos criar um email único de rastreamento</li>
                    <li>Use esse email para se inscrever na newsletter</li>
                    <li>Todos os emails serão capturados automaticamente</li>
                  </ol>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  Escolha o domínio do email
                </CardTitle>
                <CardDescription>
                  Selecione um domínio gratuito para criar seu email de rastreamento para "{trackingName}"
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="domain">Domínio Gratuito</Label>
                  <Select 
                    value={selectedDomain} 
                    onValueChange={setSelectedDomain}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Selecione um domínio" />
                    </SelectTrigger>
                    <SelectContent>
                      {domains?.map(domain => (
                        <SelectItem key={domain.id} value={domain.domain}>
                          <div className="flex items-center gap-2">
                            {domain.domain}
                            <Badge variant="secondary" className="text-xs">Gratuito</Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedDomain && (
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                    <p className="text-sm text-muted-foreground mb-1">Seu email será algo como:</p>
                    <p className="font-mono text-primary">
                      {trackingName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10)}****@{selectedDomain}
                    </p>
                  </div>
                )}
              </CardContent>
            </>
          )}

          <div className="flex items-center justify-between p-6 border-t">
            {step > 1 ? (
              <Button 
                variant="ghost" 
                onClick={() => setStep(step - 1)}
                disabled={loading || createTrackingMutation.isPending}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
            ) : (
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')}
              >
                Cancelar
              </Button>
            )}
            <Button 
              onClick={handleNext}
              disabled={!isStepValid() || loading || createTrackingMutation.isPending}
            >
              {loading || createTrackingMutation.isPending ? 'Processando...' : step === 2 ? 'Criar Rastreamento' : 'Próximo'}
              {!loading && !createTrackingMutation.isPending && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;