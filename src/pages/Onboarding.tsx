import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, ArrowRight, ArrowLeft } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { competitorService, seedService, subscriptionService } from '@/services/api';

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Step 1: Competitor
  const [competitor, setCompetitor] = useState({
    name: '',
    website: '',
    mainDomain: ''
  });

  // Step 2: Seed
  const [seed, setSeed] = useState({
    email: '',
    provider: 'gmail' as const
  });

  // Step 3: Subscription
  const [subscription, setSubscription] = useState({
    captureUrl: '',
    labels: ''
  });

  const handleNext = async () => {
    setLoading(true);
    try {
      if (step === 1) {
        await competitorService.create(competitor);
        toast({ title: 'Concorrente adicionado!' });
        setStep(2);
      } else if (step === 2) {
        await seedService.create(seed);
        toast({ title: 'E-mail seed configurado!' });
        setStep(3);
      } else if (step === 3) {
        await subscriptionService.create({
          ...subscription,
          competitorId: 'comp-1', // Mock
          seedId: 'seed-1', // Mock
          labels: subscription.labels.split(',').map(l => l.trim()).filter(Boolean)
        });
        toast({ title: 'Inscrição criada com sucesso!' });
        navigate('/');
      }
    } catch (error) {
      toast({ 
        title: 'Erro',
        description: 'Algo deu errado. Tente novamente.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const isStepValid = () => {
    if (step === 1) return competitor.name && competitor.website && competitor.mainDomain;
    if (step === 2) return seed.email && seed.provider;
    if (step === 3) return subscription.captureUrl;
    return false;
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/5 to-background">
      <div className="w-full max-w-2xl">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {[1, 2, 3].map(num => (
              <div key={num} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-base ${
                  step >= num ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
                }`}>
                  {step > num ? <CheckCircle2 className="h-5 w-5" /> : num}
                </div>
                {num < 3 && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    step > num ? 'bg-primary' : 'bg-border'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Adicionar Concorrente</span>
            <span>Configurar Seed</span>
            <span>Criar Inscrição</span>
          </div>
        </div>

        {/* Steps */}
        <Card>
          {step === 1 && (
            <>
              <CardHeader>
                <CardTitle>Adicionar Concorrente</CardTitle>
                <CardDescription>
                  Informe os dados do concorrente que deseja monitorar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Nome do Concorrente</Label>
                  <Input
                    id="name"
                    placeholder="Ex: Empresa XYZ"
                    value={competitor.name}
                    onChange={(e) => setCompetitor({ ...competitor, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    placeholder="https://exemplo.com"
                    value={competitor.website}
                    onChange={(e) => setCompetitor({ ...competitor, website: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="domain">Domínio Principal</Label>
                  <Input
                    id="domain"
                    placeholder="exemplo.com"
                    value={competitor.mainDomain}
                    onChange={(e) => setCompetitor({ ...competitor, mainDomain: e.target.value })}
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 2 && (
            <>
              <CardHeader>
                <CardTitle>Configurar E-mail Seed</CardTitle>
                <CardDescription>
                  Escolha ou crie um e-mail para receber as newsletters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="provider">Provedor</Label>
                  <Select 
                    value={seed.provider} 
                    onValueChange={(value: any) => setSeed({ ...seed, provider: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="gmail">Gmail</SelectItem>
                      <SelectItem value="outlook">Outlook</SelectItem>
                      <SelectItem value="mailgun">Mailgun</SelectItem>
                      <SelectItem value="sendgrid">SendGrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="email">E-mail Seed</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seed@seudominio.com"
                    value={seed.email}
                    onChange={(e) => setSeed({ ...seed, email: e.target.value })}
                  />
                </div>
              </CardContent>
            </>
          )}

          {step === 3 && (
            <>
              <CardHeader>
                <CardTitle>Criar Inscrição</CardTitle>
                <CardDescription>
                  Configure a inscrição do seed na newsletter do concorrente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="captureUrl">URL de Captura</Label>
                  <Input
                    id="captureUrl"
                    placeholder="https://concorrente.com/newsletter"
                    value={subscription.captureUrl}
                    onChange={(e) => setSubscription({ ...subscription, captureUrl: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="labels">Tags (separadas por vírgula)</Label>
                  <Input
                    id="labels"
                    placeholder="onboarding, promo"
                    value={subscription.labels}
                    onChange={(e) => setSubscription({ ...subscription, labels: e.target.value })}
                  />
                </div>
              </CardContent>
            </>
          )}

          <div className="flex items-center justify-between p-6 border-t">
            {step > 1 ? (
              <Button 
                variant="ghost" 
                onClick={() => setStep(step - 1)}
                disabled={loading}
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
              disabled={!isStepValid() || loading}
            >
              {loading ? 'Processando...' : step === 3 ? 'Finalizar' : 'Próximo'}
              {!loading && <ArrowRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
