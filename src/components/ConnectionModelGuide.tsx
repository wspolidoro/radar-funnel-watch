import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowRight, Globe, Webhook, Sparkles } from 'lucide-react';

export const ConnectionModelGuide = () => {
  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2 text-primary">
          <Sparkles className="h-5 w-5" />
          Como funciona o modelo de conexão?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative flex flex-col md:flex-row items-center justify-between gap-4 md:gap-2 pt-4">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center space-y-2 flex-1">
            <div className="h-12 w-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm">Alias de Email</p>
              <p className="text-xs text-muted-foreground px-2">
                Você cria um email como apple@radar.com
              </p>
            </div>
          </div>

          <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground/30" />
          <div className="md:hidden h-4 w-4 text-muted-foreground/30">↓</div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center space-y-2 flex-1">
            <div className="h-12 w-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-primary">
              <Globe className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm">DNS (MX)</p>
              <p className="text-xs text-muted-foreground px-2">
                O email chega no servidor do roteador (Maileroo)
              </p>
            </div>
          </div>

          <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground/30" />
          <div className="md:hidden h-4 w-4 text-muted-foreground/30">↓</div>

          {/* Step 3 */}
          <div className="flex flex-col items-center text-center space-y-2 flex-1">
            <div className="h-12 w-12 rounded-full bg-background border-2 border-primary/20 flex items-center justify-center text-primary">
              <Webhook className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm">Webhook</p>
              <p className="text-xs text-muted-foreground px-2">
                O email é enviado para o radar em tempo real
              </p>
            </div>
          </div>

          <ArrowRight className="hidden md:block h-6 w-6 text-muted-foreground/30" />
          <div className="md:hidden h-4 w-4 text-muted-foreground/30">↓</div>

          {/* Step 4 */}
          <div className="flex flex-col items-center text-center space-y-2 flex-1">
            <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <p className="font-bold text-sm">IA Radar</p>
              <p className="text-xs text-muted-foreground px-2">
                Análise de funil, CTAs e estratégia automática
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
