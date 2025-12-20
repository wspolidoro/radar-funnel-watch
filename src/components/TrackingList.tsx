import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Mail, Clock, CheckCircle, Trash2, Copy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface EmailAlias {
  id: string;
  name: string;
  alias: string;
  domain: string;
  email_count: number;
  first_email_at: string | null;
  is_confirmed: boolean;
  created_at: string;
}

export const TrackingList = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trackings, isLoading } = useQuery({
    queryKey: ['email-aliases', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as EmailAlias[];
    },
    enabled: !!user,
  });

  const deleteTrackingMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('email_aliases')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Rastreamento removido',
        description: 'O rastreamento foi excluído com sucesso.',
      });
      queryClient.invalidateQueries({ queryKey: ['email-aliases'] });
    },
    onError: () => {
      toast({
        title: 'Erro ao remover',
        description: 'Não foi possível remover o rastreamento.',
        variant: 'destructive',
      });
    },
  });

  const copyToClipboard = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email);
      toast({
        title: 'Copiado!',
        description: 'Email copiado para a área de transferência.',
      });
    } catch {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o email.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (tracking: EmailAlias) => {
    if (tracking.email_count > 0) {
      return (
        <Badge className="bg-success text-success-foreground gap-1">
          <CheckCircle className="h-3 w-3" />
          {tracking.email_count} email{tracking.email_count !== 1 ? 's' : ''}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="gap-1">
        <Clock className="h-3 w-3" />
        Aguardando
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Rastreamentos Ativos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!trackings || trackings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Rastreamentos Ativos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum rastreamento ativo</p>
            <p className="text-sm mt-1">Crie um novo rastreamento acima para começar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Rastreamentos Ativos
          <Badge variant="outline" className="ml-auto">
            {trackings.length} total
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trackings.map((tracking) => (
          <div
            key={tracking.id}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-medium truncate">{tracking.name}</span>
                {getStatusBadge(tracking)}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-mono text-xs truncate max-w-[200px]">
                  {tracking.alias}
                </span>
                <span className="text-xs">•</span>
                <span className="text-xs">
                  {format(new Date(tracking.created_at), "dd/MM/yy", { locale: ptBR })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 ml-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => copyToClipboard(tracking.alias)}
                title="Copiar email"
              >
                <Copy className="h-4 w-4" />
              </Button>
              {tracking.email_count > 0 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  title="Ver emails"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => deleteTrackingMutation.mutate(tracking.id)}
                title="Remover rastreamento"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
