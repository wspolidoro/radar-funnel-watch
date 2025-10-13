import { Mail, ExternalLink, Calendar, Tag, Target } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmailCategoryBadge } from './EmailCategoryBadge';
import { CTAChip } from './CTAChip';
import type { Email } from '@/types';

interface EmailViewerProps {
  email: Email | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EmailViewer: React.FC<EmailViewerProps> = ({ email, open, onOpenChange }) => {
  if (!email) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-xl">{email.subject}</SheetTitle>
          {email.preheader && (
            <SheetDescription className="text-sm">
              {email.preheader}
            </SheetDescription>
          )}
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">De:</span>
                <span className="font-medium">{email.from}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Enviado em:</span>
                <span className="font-medium">{formatDate(email.sentAt)}</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Categoria:</span>
                <EmailCategoryBadge category={email.category} />
              </div>

              {email.dayOffset !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Posição no funil:</span>
                  <Badge variant="secondary">D+{email.dayOffset}</Badge>
                </div>
              )}

              {email.isAbVariant && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge className="bg-warning/10 text-warning border-warning/20">
                    Teste A/B: {email.abVariantName || 'Variante'}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Topics */}
          {email.topics.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Tópicos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {email.topics.map((topic, idx) => (
                    <Badge key={idx} variant="outline">{topic}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* CTAs */}
          {email.ctas.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">CTAs Detectados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {email.ctas.map((cta, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Target className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1 space-y-1">
                        <div className="font-medium text-sm">{cta.text}</div>
                        {cta.url && (
                          <a 
                            href={cta.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 break-all"
                          >
                            {cta.url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        )}
                        {cta.type && (
                          <Badge variant="outline" className="text-xs">{cta.type}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content */}
          <Tabs defaultValue="html" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="html">Visualização HTML</TabsTrigger>
              <TabsTrigger value="text">Texto</TabsTrigger>
            </TabsList>
            
            <TabsContent value="html" className="mt-4">
              <Card>
                <CardContent className="p-0">
                  {email.htmlContent ? (
                    <div className="w-full h-[600px] border rounded-lg overflow-hidden">
                      <iframe
                        srcDoc={email.htmlContent}
                        className="w-full h-full"
                        sandbox="allow-same-origin"
                        title="Email Preview"
                      />
                    </div>
                  ) : (
                    <div className="p-8 text-center text-muted-foreground">
                      Conteúdo HTML não disponível
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="text" className="mt-4">
              <Card>
                <CardContent className="p-6">
                  {email.textContent ? (
                    <pre className="whitespace-pre-wrap text-sm font-mono">
                      {email.textContent}
                    </pre>
                  ) : email.htmlContent ? (
                    <p className="text-muted-foreground text-sm">
                      Use a visualização HTML para ver o conteúdo
                    </p>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      Conteúdo não disponível
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
