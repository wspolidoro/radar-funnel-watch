import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, Sparkles, Globe, ShieldCheck, Copy, Info, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Step 1: Tracking Name
  const [trackingName, setTrackingName] = useState('');
  
  // Step 2: Custom Domain Configuration
  const [customDomain, setCustomDomain] = useState('');
  const [dnsStatus, setDnsStatus] = useState<'pending' | 'verified' | 'incorrect' | 'no_records'>('pending');
  const [isVerifying, setIsVerifying] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/receive-email`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  const verifyDns = async () => {
    if (!customDomain.trim() || !customDomain.includes('.')) {
      toast({ 
        title: 'Domínio inválido',
        description: 'Informe um domínio antes de verificar.',
        variant: 'destructive'
      });
      return;
    }

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-dns', {
        body: { domain: customDomain.toLowerCase().trim() },
      });

      if (error) throw error;

      if (data.is_correct) {
        setDnsStatus('verified');
        toast({ title: 'DNS Verificado!', description: 'Seus registros MX estão corretos.' });
      } else {
        setDnsStatus(data.status || 'incorrect');
        toast({ 
          title: 'DNS Incorreto', 
          description: data.error || 'Aguarde a propagação ou verifique os registros.',
          variant: 'destructive'
        });
      }
    } catch (e: any) {
      toast({ 
        title: 'Erro na verificação', 
        description: e.message,
        variant: 'destructive'
      });
    } finally {
      setIsVerifying(false);
    }
  };

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
      
      const cleanDomain = customDomain.toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
      if (!cleanDomain.includes('.')) throw new Error('Domínio inválido');

      // 1. Create the custom domain first
      const { data: domainData, error: domainError } = await supabase
        .from('email_domains')
        .insert({
          user_id: user.id,
          domain: cleanDomain,
          provider: 'maileroo',
          is_verified: false,
          is_active: true,
          is_platform_domain: false
        })
        .select()
        .single();

      if (domainError) throw domainError;

      // 2. Create the first alias
      const localPart = generateUniqueIdentifier(trackingName);
      const alias = `${localPart}@${cleanDomain}`;
      
      const { data, error } = await supabase
        .from('email_aliases')
        .insert({
          user_id: user.id,
          name: trackingName.trim(),
          alias: alias,
          local_part: localPart,
          domain: cleanDomain,
          description: `Primeiro rastreamento: ${trackingName}`,
        })
        .select()
        .single();

      if (error) throw error;
      return { alias: data.alias, domainId: domainData.id };
    },
    onSuccess: (data) => {
      toast({ 
        title: 'Configuração inicial concluída!',
        description: `Use ${data.alias} para sua primeira análise.`
      });
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      navigate(`/app/configuracoes/dominios/${data.domainId}/verificar`);
    },
    onError: (error: any) => {
      toast({ 
        title: 'Erro',
        description: error.message || 'Algo deu errado. Tente novamente.',
        variant: 'destructive'
      });
      console.error(error);
    },
  });

  const handleNext = async () => {
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
      if (!customDomain.trim() || !customDomain.includes('.')) {
        toast({ 
          title: 'Domínio inválido',
          description: 'Informe um domínio ou subdomínio válido.',
          variant: 'destructive'
        });
        return;
      }
      setLoading(true);
      try {
        await createTrackingMutation.mutateAsync();
      } finally {
        setLoading(false);
      }
    }
  };

  const isStepValid = () => {
    if (step === 1) return trackingName.trim().length > 0;
    if (step === 2) return customDomain.trim().length > 3 && customDomain.includes('.');
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
            <span>Identificar Campanhas</span>
            <span>Conectar Maileroo</span>
          </div>
        </div>

        {/* Steps */}
        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Sparkles className="h-6 w-6 text-primary" />
                  Bem-vindo ao RadarMail
                </CardTitle>
                <CardDescription>
                  Qual newsletter ou empresa você quer monitorar primeiro?
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome da Empresa ou Newsletter</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Apple, Nubank, Estratégia do Concorrente..."
                    value={trackingName}
                    onChange={(e) => setTrackingName(e.target.value)}
                    className="mt-2 text-lg py-6"
                  />
                </div>

                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" />
                    Como funciona o rastreamento?
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0">1</Badge>
                      <span>Vamos criar um email único para esta campanha.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0">2</Badge>
                      <span>Use esse email para se inscrever e capturar as mensagens.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 shrink-0">3</Badge>
                      <span>Nossa IA analisa cada email, revelando a estratégia e o funil.</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Globe className="h-6 w-6 text-primary" />
                  Conexão via Maileroo
                </CardTitle>
                <CardDescription>
                  Configure seu domínio de destino para capturar os emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="domain">Seu Domínio ou Subdomínio</Label>
                  <Input
                    id="domain"
                    placeholder="emails.seudominio.com"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    className="text-lg py-6"
                  />
                  <p className="text-xs text-muted-foreground">
                    Recomendamos usar um subdomínio como <span className="font-mono">radar.seu-site.com</span>
                  </p>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4">
                  <div className="space-y-2">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      Passo 1: Apontamento DNS (MX)
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      No seu gerenciador de domínio (Cloudflare, etc), crie este registro:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-xs">
                      <Badge variant="outline">MX</Badge>
                      <span className="flex-1 text-primary">mx.maileroo.com</span>
                      <Badge variant="outline">Prioridade: 10</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-bold text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary" />
                      Passo 2: Roteamento Webhook
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      No painel do Maileroo, encaminhe os emails para:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-xs">
                      <span className="truncate flex-1">{webhookUrl}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookUrl)} className="h-6 w-6">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </>
          )}

          <div className="flex items-center justify-between p-6 border-t bg-muted/20">
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
                Pular Onboarding
              </Button>
            )}
            <Button 
              onClick={handleNext}
              size="lg"
              disabled={!isStepValid() || loading || createTrackingMutation.isPending}
              className="px-8"
            >
              {loading || createTrackingMutation.isPending ? 'Finalizando...' : step === 2 ? 'Concluir Configuração' : 'Próximo Passo'}
              {!loading && !createTrackingMutation.isPending && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
