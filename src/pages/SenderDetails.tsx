import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Inbox, 
  AlertTriangle,
  Eye,
  ExternalLink,
  FileText
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';

const categoryLabels: Record<string, string> = {
  'promotional': 'Promocional',
  'transactional': 'Transacional',
  'newsletter': 'Newsletter',
  'onboarding': 'Onboarding',
  'notification': 'Notificação',
  'educational': 'Educacional',
  'unknown': 'Desconhecido'
};

export default function SenderDetails() {
  const { email } = useParams<{ email: string }>();
  const navigate = useNavigate();
  const [selectedEmail, setSelectedEmail] = useState<any>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const decodedEmail = email ? decodeURIComponent(email) : '';

  // Buscar aliases do usuário para mapear nomes
  const { data: aliases } = useQuery({
    queryKey: ['email-aliases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('id, alias, name');
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar todos os emails deste remetente
  const { data: emails, isLoading } = useQuery({
    queryKey: ['sender-emails', decodedEmail],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('captured_newsletters')
        .select('*')
        .eq('from_email', decodedEmail)
        .order('received_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!decodedEmail
  });

  // Calcular estatísticas
  const stats = {
    totalEmails: emails?.length || 0,
    uniqueAliases: new Set(emails?.map(e => e.alias_id).filter(Boolean)).size,
    categories: [...new Set(emails?.map(e => e.category).filter(Boolean))] as string[],
    firstEmail: emails?.length ? emails[emails.length - 1]?.received_at : null,
    lastEmail: emails?.length ? emails[0]?.received_at : null,
    fromName: emails?.find(e => e.from_name)?.from_name || null
  };

  // Detectar se é suspeito (múltiplos aliases)
  const isUnexpected = stats.uniqueAliases > 1;

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAliasName = (aliasId: string | null) => {
    if (!aliasId || !aliases) return 'Desconhecido';
    const alias = aliases.find(a => a.id === aliasId);
    return alias?.alias || aliasId;
  };

  const handlePreview = (email: any) => {
    setSelectedEmail(email);
    setIsPreviewOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/senders')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">
              {stats.fromName || decodedEmail}
            </h1>
            {isUnexpected && (
              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Possível Vazamento
              </Badge>
            )}
          </div>
          {stats.fromName && (
            <p className="text-muted-foreground">{decodedEmail}</p>
          )}
        </div>
      </div>

      {/* Alerta de vazamento */}
      {isUnexpected && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-700">
                  Este remetente enviou emails para {stats.uniqueAliases} aliases diferentes
                </p>
                <p className="text-sm text-yellow-600/80">
                  Isso pode indicar que seus dados foram compartilhados ou vendidos entre empresas.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Total de Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalEmails}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Inbox className="h-4 w-4" />
              Aliases Afetados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.uniqueAliases}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Primeiro Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDate(stats.firstEmail)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Último Email
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm font-medium">{formatDate(stats.lastEmail)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Categorias */}
      {stats.categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Categorias de Email</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {stats.categories.map(cat => (
                <Badge key={cat} variant="secondary">
                  {categoryLabels[cat] || cat}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lista de Emails */}
      <Card>
        <CardHeader>
          <CardTitle>Emails Recebidos</CardTitle>
          <CardDescription>
            Todos os emails recebidos deste remetente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {emails?.map((email) => (
              <div 
                key={email.id} 
                className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                onClick={() => handlePreview(email)}
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium truncate">{email.subject}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {getAliasName(email.alias_id)}
                        </Badge>
                        {email.category && (
                          <Badge variant="secondary" className="text-xs">
                            {categoryLabels[email.category] || email.category}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm text-muted-foreground">
                        {formatDate(email.received_at)}
                      </p>
                      <Button variant="ghost" size="sm" className="mt-1">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {email.text_content && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {email.text_content.substring(0, 200)}...
                    </p>
                  )}
                </div>
              </div>
            ))}

            {(!emails || emails.length === 0) && (
              <div className="text-center py-12">
                <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum email encontrado deste remetente.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Preview Sheet */}
      <Sheet open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col">
          {selectedEmail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">{selectedEmail.subject}</SheetTitle>
                <SheetDescription>
                  Recebido em {formatDate(selectedEmail.received_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="flex gap-2 mt-4">
                <Badge variant="outline">
                  {getAliasName(selectedEmail.alias_id)}
                </Badge>
                {selectedEmail.category && (
                  <Badge variant="secondary">
                    {categoryLabels[selectedEmail.category] || selectedEmail.category}
                  </Badge>
                )}
                {selectedEmail.word_count && (
                  <Badge variant="outline">
                    {selectedEmail.word_count} palavras
                  </Badge>
                )}
              </div>

              <ScrollArea className="flex-1 mt-4">
                {selectedEmail.html_content ? (
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert"
                    dangerouslySetInnerHTML={{ __html: selectedEmail.html_content }}
                  />
                ) : selectedEmail.text_content ? (
                  <pre className="whitespace-pre-wrap text-sm font-sans">
                    {selectedEmail.text_content}
                  </pre>
                ) : (
                  <p className="text-muted-foreground">
                    Conteúdo não disponível.
                  </p>
                )}
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}