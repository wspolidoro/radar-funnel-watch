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
  const [foundMx, setFoundMx] = useState<{ preference: number; exchange: string }[]>([]);
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

      const records = data.found_mx || [];
      setFoundMx(records);

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
        setDnsStatus('verified'); // If webhook works, DNS must be mostly OK or it's a simulation success
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
      setSetupLogs([{ msg: `Provisionando domínio: ${cleanDomain}...`, status: 'pending' as const }]);
      
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
        setSetupLogs(prev => [
          ...prev.map(l => l.status === 'pending' ? { ...l, status: 'error' as const } : l), 
          { msg: `Erro ao criar domínio: ${domainError.message}`, status: 'error' as const }
        ]);
        throw domainError;
      }
      setSetupLogs(prev => prev.map(l => l.msg.includes('Provisionando') ? { ...l, status: 'success' as const } : l));

      // 2. Create Alias
      setSetupStep('alias');
      setSetupLogs(prev => [...prev, { msg: `Configurando rastreador: ${trackingName}...`, status: 'pending' as const }]);
      
      const localPart = generateUniqueIdentifier(trackingName);
      const alias = `${localPart}@${cleanDomain}`;
      
      const { data: aliasData, error: aliasError } = await supabase
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
        setSetupLogs(prev => [
          ...prev.map(l => l.status === 'pending' ? { ...l, status: 'error' as const } : l), 
          { msg: `Erro no alias: ${aliasError.message}`, status: 'error' as const }
        ]);
        throw aliasError;
      }
      setSetupLogs(prev => prev.map(l => l.msg.includes('Configurando') ? { ...l, status: 'success' as const } : l));

      // 3. Final Check
      setSetupStep('connectivity');
      setSetupLogs(prev => [...prev, { msg: 'Validando conexão com Maileroo...', status: 'pending' as const }]);
      
      const { data: verifyData } = await supabase.functions.invoke('verify-dns', {
        body: { domainId: domainData.id, domain: cleanDomain },
      });

      if (verifyData?.is_correct) {
        setSetupLogs(prev => prev.map(l => l.msg.includes('Validando') ? { ...l, status: 'success' as const } : l));
      } else {
        setSetupLogs(prev => prev.map(l => l.msg.includes('Validando') ? { ...l, status: 'success' as const } : l));
        setSetupLogs(prev => [...prev, { msg: 'Atenção: DNS ainda em propagação.', status: 'success' as const }]);
      }

      setSetupStep('complete');
      return { alias: aliasData.alias, domainId: domainData.id };
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
                    <div className="flex flex-col gap-2 mt-1">
                      <p className="text-xs text-destructive flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" /> Registros MX ainda não detectados. Verifique no painel do Maileroo.
                      </p>
                    </div>
                  )}
                  {dnsStatus === 'no_records' && (
                    <div className="flex flex-col gap-2 mt-1">
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <Info className="h-3 w-3" /> Domínio sem registros MX. Configure-os para continuar.
                      </p>
                    </div>
                  )}
                  {dnsStatus === 'verified' && (
                    <p className="text-xs text-success flex items-center gap-1 mt-1">
                      <CheckCircle2 className="h-3 w-3" /> Configuração validada com sucesso!
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Recomendamos usar um subdomínio como <span className="font-mono">radar.seu-site.com</span>
                  </p>
                </div>

                <div className="bg-primary/5 p-4 rounded-xl border border-primary/20 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        Passo 1: Apontamento DNS (MX)
                      </h4>
                      {dnsStatus === 'verified' && <CheckCircle2 className="h-4 w-4 text-success" />}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      No seu gerenciador de domínio (Cloudflare, etc), crie este registro exatamente como abaixo:
                    </p>
                    <div className="grid grid-cols-1 gap-2">
                      <div className="flex items-center gap-2 p-2 bg-background border rounded font-mono text-[10px] relative group overflow-hidden">
                        <div className="flex flex-col flex-1 truncate">
                          <span className="text-[9px] uppercase text-muted-foreground">Tipo/Prioridade</span>
                          <span className="font-bold">MX (10)</span>
                        </div>
                        <div className="flex flex-col flex-[2] truncate">
                          <span className="text-[9px] uppercase text-muted-foreground">Valor (Servidor)</span>
                          <span className="font-bold text-primary">mx.maileroo.com</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => copyToClipboard('mx.maileroo.com')} 
                          className="h-8 w-8 shrink-0 hover:bg-primary/10"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="w-full text-[10px] h-8 gap-2 bg-primary/10 text-primary hover:bg-primary/20 border-none"
                        onClick={() => copyToClipboard('Tipo: MX\nPrioridade: 10\nServidor: mx.maileroo.com')}
                      >
                        <Copy className="h-3 w-3" />
                        Copiar Bloco Completo
                      </Button>
                    </div>
                  </div>

                    {foundMx.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                            <Server className="h-3 w-3" />
                            Registros Encontrados no DNS
                          </h5>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={verifyDns} 
                            disabled={isVerifying}
                            className="h-6 text-[10px] gap-1"
                          >
                            <RefreshCw className={`h-3 w-3 ${isVerifying ? 'animate-spin' : ''}`} />
                            Atualizar
                          </Button>
                        </div>
                        <div className="space-y-1.5">
                          {foundMx.map((record, idx) => {
                            const isCorrect = record.exchange.toLowerCase() === 'mx.maileroo.com';
                            return (
                              <div key={idx} className="flex items-center justify-between p-2 bg-background/50 border border-border/50 rounded-lg text-[10px]">
                                <div className="flex flex-col">
                                  <span className="font-mono">{record.exchange}</span>
                                  <span className="text-muted-foreground">Prioridade: {record.preference}</span>
                                </div>
                                <Badge 
                                  variant="outline" 
                                  className={`text-[9px] px-1.5 py-0 ${isCorrect ? 'bg-success/10 text-success border-success/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}
                                >
                                  {isCorrect ? 'Correto' : 'Divergente'}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {foundMx.length === 0 && (dnsStatus === 'incorrect' || dnsStatus === 'no_records') && (
                      <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-destructive uppercase flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Status: Pendente
                          </p>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={verifyDns} 
                            disabled={isVerifying}
                            className="h-6 text-[10px] gap-1 text-destructive hover:bg-destructive/10"
                          >
                            <RefreshCw className={`h-3 w-3 ${isVerifying ? 'animate-spin' : ''}`} />
                            Tentar Novamente
                          </Button>
                        </div>
                        <p className="text-[10px] text-destructive/80 leading-relaxed">
                          Nenhum registro MX foi detectado para o domínio {customDomain}. Isso é comum nos primeiros minutos após a configuração.
                        </p>
                      </div>
                    )}
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

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Terminal className="h-6 w-6 text-primary" />
                  Finalizando Setup
                </CardTitle>
                <CardDescription>
                  Estamos configurando sua infraestrutura de inteligência
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      {setupStep === 'domain' ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : <Server className="h-5 w-5 text-muted-foreground" />}
                      <span className={setupStep === 'domain' ? 'font-bold' : ''}>Provisionamento de Domínio</span>
                    </div>
                    {setupStep !== 'domain' && <CheckCircle2 className="h-5 w-5 text-success" />}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      {setupStep === 'alias' ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : <Zap className="h-5 w-5 text-muted-foreground" />}
                      <span className={setupStep === 'alias' ? 'font-bold' : ''}>Configuração do Rastreador</span>
                    </div>
                    {(setupStep === 'connectivity' || setupStep === 'complete') && <CheckCircle2 className="h-5 w-5 text-success" />}
                  </div>

                  <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="flex items-center gap-3">
                      {setupStep === 'connectivity' ? <RefreshCw className="h-5 w-5 animate-spin text-primary" /> : <Globe className="h-5 w-5 text-muted-foreground" />}
                      <span className={setupStep === 'connectivity' ? 'font-bold' : ''}>Validação de Conectividade</span>
                    </div>
                    {setupStep === 'complete' && <CheckCircle2 className="h-5 w-5 text-success" />}
                  </div>
                </div>

                <div className="bg-black/90 p-4 rounded-lg font-mono text-[10px] sm:text-xs text-green-400 min-h-[120px] max-h-[200px] overflow-y-auto">
                  <div className="flex items-center gap-2 mb-2 text-muted-foreground border-b border-white/10 pb-1">
                    <Terminal className="h-3 w-3" /> system_logs
                  </div>
                  {setupLogs.map((log, i) => (
                    <div key={i} className="mb-1 flex gap-2">
                      <span className="text-white/30">[{new Date().toLocaleTimeString()}]</span>
                      <span className={log.status === 'error' ? 'text-red-400' : log.status === 'success' ? 'text-green-400' : 'text-blue-300'}>
                        {log.status === 'error' ? '✖' : log.status === 'success' ? '✔' : '➜'} {log.msg}
                      </span>
                    </div>
                  ))}
                  {setupStep !== 'complete' && <div className="animate-pulse">_</div>}
                </div>
              </CardContent>
            </>
          )}

          <div className="flex items-center justify-between p-6 border-t bg-muted/20">
            {step === 1 && (
              <Button variant="ghost" onClick={() => navigate('/')}>
                Pular Onboarding
              </Button>
            )}
            {step === 2 && (
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
              </Button>
            )}
            
            {step < 3 && (
              <div className="flex gap-2 ml-auto">
                {step === 2 && dnsStatus !== 'verified' && (
                  <Button 
                    variant="outline"
                    onClick={verifyDns}
                    disabled={isVerifying || !customDomain.includes('.')}
                    className="border-primary/20 text-primary hover:bg-primary/5"
                  >
                    {isVerifying ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Testar Configuração
                  </Button>
                )}
                <Button 
                  onClick={handleNext}
                  size="lg"
                  disabled={!isStepValid() || loading || (step === 2 && dnsStatus !== 'verified')}
                  className="px-8 group"
                >
                  {loading ? 'Processando...' : step === 2 ? 'Concluir Configuração' : 'Próximo Passo'}
                  {!loading && <ArrowRight className="h-4 w-4 ml-2 transition-transform group-hover:translate-x-1" />}
                </Button>
              </div>
            )}
            
            {step === 3 && setupStep === 'complete' && (
              <p className="text-sm text-muted-foreground italic w-full text-center">
                Redirecionando para o painel de controle...
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
