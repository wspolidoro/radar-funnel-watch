import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft, Mail, Sparkles, Globe, ShieldCheck, Copy, Info, RefreshCw, AlertCircle, Play, Loader2, Server, Terminal, Zap } from 'lucide-react';
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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [setupStep, setSetupStep] = useState<'domain' | 'alias' | 'connectivity' | 'complete'>('domain');
  const [setupLogs, setSetupLogs] = useState<{ msg: string; status: 'pending' | 'success' | 'error' }[]>([]);
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
  const [isSimulating, setIsSimulating] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'pending' | 'success' | 'error'>('pending');
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

  const simulateWebhook = async () => {
    if (!customDomain.trim() || !customDomain.includes('.')) {
      toast({ title: 'Domínio inválido', variant: 'destructive' });
      return;
    }

    setIsSimulating(true);
    try {
      const mockPayload = {
        recipients: [`onboarding-test@${customDomain.toLowerCase().trim()}`],
        headers: {
          From: ["Onboarding RadarMail <teste@radarmail.com>"],
          Subject: ["Teste de Onboarding Webhook"]
        },
        body: {
          html: "<p>Validando roteamento de entrada...</p>",
          plaintext: "Validando roteamento de entrada..."
        },
        message_id: `onb-${Date.now()}`,
        domain: customDomain.toLowerCase().trim()
      };

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY
        },
        body: JSON.stringify(mockPayload)
      });

      if (response.ok) {
        setWebhookStatus('success');
        toast({ title: 'Simulação concluída!', description: 'O roteamento do webhook está funcionando.' });
      } else {
        setWebhookStatus('error');
        toast({ title: 'Erro no Webhook', description: 'Não foi possível processar a simulação.', variant: 'destructive' });
      }
    } catch (e: any) {
      setWebhookStatus('error');
      toast({ title: 'Falha na conexão', description: e.message, variant: 'destructive' });
    } finally {
      setIsSimulating(false);
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

      setStep(3); // Go to final progress view
      
      // 1. Create Domain
      setSetupStep('domain');
      setSetupLogs([{ msg: `Provisionando domínio: ${cleanDomain}...`, status: 'pending' }]);
      
      const { data: domainData, error: domainError } = await supabase
        .from('email_domains')
        .insert({
          user_id: user.id,
          domain: cleanDomain,
          provider: 'maileroo',
          is_verified: dnsStatus === 'verified',
          is_active: true,
          is_platform_domain: false
        })
        .select()
        .single();

      if (domainError) {
        setSetupLogs(prev => [...prev.map(l => l.status === 'pending' ? { ...l, status: 'error' } : l), { msg: `Erro ao criar domínio: ${domainError.message}`, status: 'error' }]);
        throw domainError;
      }
      setSetupLogs(prev => prev.map(l => l.msg.includes('Provisionando') ? { ...l, status: 'success' } : l));

      // 2. Create Alias
      setSetupStep('alias');
      setSetupLogs(prev => [...prev, { msg: `Configurando rastreador: ${trackingName}...`, status: 'pending' }]);
      
      const localPart = generateUniqueIdentifier(trackingName);
      const alias = `${localPart}@${cleanDomain}`;
      
      const { data, error: aliasError } = await supabase
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

      if (aliasError) {
        setSetupLogs(prev => [...prev.map(l => l.status === 'pending' ? { ...l, status: 'error' } : l), { msg: `Erro no alias: ${aliasError.message}`, status: 'error' }]);
        throw aliasError;
      }
      setSetupLogs(prev => prev.map(l => l.msg.includes('Configurando') ? { ...l, status: 'success' } : l));

      // 3. Final Check
      setSetupStep('connectivity');
      setSetupLogs(prev => [...prev, { msg: 'Validando conexão com Maileroo...', status: 'pending' }]);
      
      // Mock connectivity check or real verify-dns again
      const { data: verifyData } = await supabase.functions.invoke('verify-dns', {
        body: { domainId: domainData.id, domain: cleanDomain },
      });

      if (verifyData?.is_correct) {
        setSetupLogs(prev => prev.map(l => l.msg.includes('Validando') ? { ...l, status: 'success' } : l));
      } else {
        setSetupLogs(prev => prev.map(l => l.msg.includes('Validando') ? { ...l, status: 'success' } : l));
        setSetupLogs(prev => [...prev, { msg: 'Atenção: DNS ainda em propagação. Finalize no painel.', status: 'success' }]);
      }

      setSetupStep('complete');
      return { alias: data.alias, domainId: domainData.id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['email-domains'] });
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
      
      setTimeout(() => {
        navigate(`/app/configuracoes/dominios/${data.domainId}/verificar`);
      }, 2000);
    },
    onError: (error: any) => {
      setLoading(false);
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
                <CardTitle className="flex items-center justify-between text-2xl">
                  <div className="flex items-center gap-2">
                    <Globe className="h-6 w-6 text-primary" />
                    Conexão via Maileroo
                  </div>
                  {dnsStatus === 'verified' && (
                    <Badge className="bg-success text-white">DNS OK</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Configure seu domínio de destino para capturar os emails
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="domain">Seu Domínio ou Subdomínio</Label>
                  <div className="flex gap-2">
                    <Input
                      id="domain"
                      placeholder="emails.seudominio.com"
                      value={customDomain}
                      onChange={(e) => {
                        setCustomDomain(e.target.value);
                        setDnsStatus('pending');
                      }}
                      className="text-lg py-6"
                    />
                    <Button 
                      variant="outline" 
                      onClick={verifyDns}
                      disabled={isVerifying || !customDomain.includes('.')}
                      className="h-auto"
                    >
                      {isVerifying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                      <span className="hidden sm:ml-2 sm:inline">Verificar DNS</span>
                    </Button>
                  </div>
                  {dnsStatus === 'incorrect' && (
                    <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3" /> Registros MX ainda não detectados. Verifique no painel do Maileroo.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recomendamos usar um subdomínio como <span className="font-mono">radar.seu-site.com</span>
                  </p>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Passo 1: Apontamento DNS (MX)
                      </h4>
                      {dnsStatus === 'verified' && <CheckCircle2 className="h-4 w-4 text-success" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No seu gerenciador de domínio (Cloudflare, etc), crie este registro:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-xs">
                      <Badge variant="outline">MX</Badge>
                      <span className="flex-1 text-primary">mx.maileroo.com</span>
                      <Badge variant="outline">Prioridade: 10</Badge>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4 text-primary" />
                        Passo 2: Roteamento Webhook
                      </h4>
                      {webhookStatus === 'success' && <CheckCircle2 className="h-4 w-4 text-success" />}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      No painel do Maileroo, encaminhe os emails para:
                    </p>
                    <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-xs overflow-hidden">
                      <span className="truncate flex-1">{webhookUrl}</span>
                      <Button variant="ghost" size="icon" onClick={() => copyToClipboard(webhookUrl)} className="h-6 w-6 shrink-0">
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full mt-2 gap-2 border-primary/20 text-primary hover:bg-primary/5" 
                      onClick={simulateWebhook}
                      disabled={isSimulating || dnsStatus !== 'verified'}
                    >
                      {isSimulating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-current" />}
                      Testar Roteamento do Webhook
                    </Button>
                    {dnsStatus !== 'verified' && (
                      <p className="text-[10px] text-muted-foreground italic text-center">
                        Verifique o DNS primeiro para liberar o teste de webhook.
                      </p>
                    )}
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
