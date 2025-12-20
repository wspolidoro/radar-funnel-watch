import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Inbox, Search, Filter, Mail, Calendar, User, Tag, ExternalLink, Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ExportNewslettersButton } from '@/components/ExportNewslettersButton';
import { QuickAliasGenerator } from '@/components/QuickAliasGenerator';

interface CapturedNewsletter {
  id: string;
  seed_id: string;
  competitor_id: string | null;
  from_email: string;
  from_name: string | null;
  subject: string;
  html_content: string | null;
  text_content: string | null;
  received_at: string;
  is_processed: boolean;
  category: string | null;
  created_at: string;
  email_seeds?: {
    name: string;
    email: string;
  };
}

const categoryLabels: Record<string, { label: string; color: string }> = {
  onboarding: { label: 'Onboarding', color: 'bg-blue-500' },
  promo: { label: 'Promocional', color: 'bg-red-500' },
  educacao: { label: 'Educacional', color: 'bg-green-500' },
  reengajamento: { label: 'Reengajamento', color: 'bg-orange-500' },
  sazonal: { label: 'Sazonal', color: 'bg-purple-500' },
  newsletter: { label: 'Newsletter', color: 'bg-cyan-500' },
  transacional: { label: 'Transacional', color: 'bg-gray-500' },
  outros: { label: 'Outros', color: 'bg-slate-500' },
};

const CapturedNewsletters = () => {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [seedFilter, setSeedFilter] = useState<string>('all');
  const [selectedNewsletter, setSelectedNewsletter] = useState<CapturedNewsletter | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCategorizing, setIsCategorizing] = useState(false);

  const { data: newsletters, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ['captured-newsletters', searchQuery, categoryFilter, seedFilter],
    queryFn: async () => {
      let query = supabase
        .from('captured_newsletters')
        .select(`
          *,
          email_seeds (
            name,
            email
          )
        `)
        .order('received_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`subject.ilike.%${searchQuery}%,from_email.ilike.%${searchQuery}%,from_name.ilike.%${searchQuery}%`);
      }
      
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      if (seedFilter && seedFilter !== 'all') {
        query = query.eq('seed_id', seedFilter);
      }

      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      return data as CapturedNewsletter[];
    },
  });

  const { data: seeds } = useQuery({
    queryKey: ['email-seeds-filter'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_seeds')
        .select('id, name, email')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  const handleViewDetail = (newsletter: CapturedNewsletter) => {
    setSelectedNewsletter(newsletter);
    setIsDetailOpen(true);
  };

  const handleCategorizeAll = async () => {
    setIsCategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('categorize-newsletter', {
        body: { batchProcess: true }
      });

      if (error) throw error;

      toast({
        title: 'Categorização concluída',
        description: `${data.processed} newsletters foram categorizadas com IA.`,
      });
      
      refetch();
    } catch (error) {
      console.error('Error categorizing newsletters:', error);
      toast({
        title: 'Erro na categorização',
        description: 'Não foi possível categorizar as newsletters. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCategorizing(false);
    }
  };

  const getCategoryBadge = (category: string | null) => {
    if (!category) return <Badge variant="outline">Não classificado</Badge>;
    const cat = categoryLabels[category];
    if (!cat) return <Badge variant="outline">{category}</Badge>;
    return (
      <Badge className={`${cat.color} text-white`}>
        {cat.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Inbox className="h-8 w-8" />
            Newsletters Capturadas
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize e analise as newsletters detectadas automaticamente
          </p>
        </div>
        <div className="flex gap-2">
          <ExportNewslettersButton newsletters={newsletters} isLoading={isLoading} />
          <Button 
            variant="outline" 
            onClick={handleCategorizeAll}
            disabled={isCategorizing}
            className="gap-2"
          >
            <Sparkles className={`h-4 w-4 ${isCategorizing ? 'animate-pulse' : ''}`} />
            {isCategorizing ? 'Categorizando...' : 'Categorizar com IA'}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            disabled={isRefetching}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Quick Alias Generator */}
      <QuickAliasGenerator onAliasCreated={() => refetch()} />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assunto, remetente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {Object.entries(categoryLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={seedFilter} onValueChange={setSeedFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Mail className="h-4 w-4 mr-2" />
                <SelectValue placeholder="E-mail Seed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os seeds</SelectItem>
                {seeds?.map((seed) => (
                  <SelectItem key={seed.id} value={seed.id}>{seed.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Newsletter List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : newsletters && newsletters.length > 0 ? (
        <div className="space-y-3">
          {newsletters.map((newsletter) => (
            <Card 
              key={newsletter.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleViewDetail(newsletter)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getCategoryBadge(newsletter.category)}
                      {newsletter.is_processed && (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Processado
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-lg truncate">{newsletter.subject}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {newsletter.from_name || newsletter.from_email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(newsletter.received_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                      {newsletter.email_seeds && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {newsletter.email_seeds.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Inbox className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma newsletter capturada</h3>
              <p className="text-sm max-w-md mx-auto">
                Configure seus e-mails seed nas Configurações para começar a capturar newsletters automaticamente.
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <a href="/settings">Ir para Configurações</a>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Newsletter Detail Sheet */}
      <Sheet open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedNewsletter && (
            <>
              <SheetHeader>
                <SheetTitle className="text-xl">{selectedNewsletter.subject}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">De</p>
                    <p className="font-medium">
                      {selectedNewsletter.from_name && (
                        <span>{selectedNewsletter.from_name} </span>
                      )}
                      <span className="text-muted-foreground">&lt;{selectedNewsletter.from_email}&gt;</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Recebido em</p>
                    <p className="font-medium">
                      {format(new Date(selectedNewsletter.received_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Categoria</p>
                    <div className="mt-1">{getCategoryBadge(selectedNewsletter.category)}</div>
                  </div>
                  <div>
                    <p className="text-muted-foreground">E-mail Seed</p>
                    <p className="font-medium">{selectedNewsletter.email_seeds?.name || 'N/A'}</p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h4 className="font-medium mb-4">Conteúdo do E-mail</h4>
                  {selectedNewsletter.html_content ? (
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <iframe
                        srcDoc={selectedNewsletter.html_content}
                        className="w-full h-[500px]"
                        sandbox="allow-same-origin"
                        title="Email content"
                      />
                    </div>
                  ) : selectedNewsletter.text_content ? (
                    <div className="bg-muted p-4 rounded-lg whitespace-pre-wrap text-sm">
                      {selectedNewsletter.text_content}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Conteúdo não disponível
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default CapturedNewsletters;