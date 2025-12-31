import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Mail, Users, Calendar, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Acompanhamento {
  id: string;
  alias: string;
  name: string | null;
  description: string | null;
  sender_name: string | null;
  sender_category: string | null;
  email_count: number | null;
  first_email_at: string | null;
  is_confirmed: boolean | null;
  created_at: string;
}

export default function Acompanhamentos() {
  const navigate = useNavigate();

  const { data: acompanhamentos, isLoading } = useQuery({
    queryKey: ['acompanhamentos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Acompanhamento[];
    },
  });

  const getCategoryColor = (category: string | null) => {
    const colors: Record<string, string> = {
      'ecommerce': 'bg-blue-500/10 text-blue-500',
      'saas': 'bg-purple-500/10 text-purple-500',
      'news': 'bg-green-500/10 text-green-500',
      'marketing': 'bg-orange-500/10 text-orange-500',
      'finance': 'bg-yellow-500/10 text-yellow-500',
    };
    return colors[category || ''] || 'bg-muted text-muted-foreground';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Acompanhamentos</h1>
          <p className="text-muted-foreground">
            Gerencie seus emails de rastreamento e monitore as newsletters capturadas
          </p>
        </div>
        <Button onClick={() => navigate('/app/acompanhamentos/novo')} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Acompanhamento
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de Acompanhamentos</CardDescription>
            <CardTitle className="text-3xl">{acompanhamentos?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Emails Capturados</CardDescription>
            <CardTitle className="text-3xl">
              {acompanhamentos?.reduce((acc, a) => acc + (a.email_count || 0), 0) || 0}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Ativos</CardDescription>
            <CardTitle className="text-3xl">
              {acompanhamentos?.filter(a => a.is_confirmed).length || 0}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* List */}
      {acompanhamentos && acompanhamentos.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {acompanhamentos.map((acompanhamento) => (
            <Card 
              key={acompanhamento.id} 
              className="cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => navigate(`/app/acompanhamentos/remetentes?alias=${acompanhamento.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {acompanhamento.name || acompanhamento.sender_name || 'Sem nome'}
                    </CardTitle>
                    <CardDescription className="text-xs font-mono">
                      {acompanhamento.alias}
                    </CardDescription>
                  </div>
                  {acompanhamento.sender_category && (
                    <Badge variant="secondary" className={getCategoryColor(acompanhamento.sender_category)}>
                      {acompanhamento.sender_category}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {acompanhamento.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {acompanhamento.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    <span>{acompanhamento.email_count || 0} emails</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {formatDistanceToNow(new Date(acompanhamento.created_at), { 
                        addSuffix: true, 
                        locale: ptBR 
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 border-t">
                  <Badge variant={acompanhamento.is_confirmed ? 'default' : 'secondary'}>
                    {acompanhamento.is_confirmed ? 'Ativo' : 'Pendente'}
                  </Badge>
                  <Button variant="ghost" size="sm" className="gap-1">
                    Ver detalhes
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <Users className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Nenhum acompanhamento criado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro acompanhamento para começar a monitorar newsletters
              </p>
            </div>
            <Button onClick={() => navigate('/app/acompanhamentos/novo')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Acompanhamento
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
