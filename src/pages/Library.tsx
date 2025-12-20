import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, LayoutGrid, List, Filter, Calendar, Mail, User, FolderOpen, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EmailThumbnail } from '@/components/EmailThumbnail';
import { EmailCategoryBadge } from '@/components/EmailCategoryBadge';
import { EmailViewer } from '@/components/EmailViewer';
import { format, subDays, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Email } from '@/types';

interface CapturedNewsletter {
  id: string;
  seed_id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  html_content: string | null;
  text_content: string | null;
  received_at: string;
  is_processed: boolean;
  category: string | null;
  email_type: string | null;
  ctas: any;
  email_seeds?: {
    id: string;
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

const periodOptions = [
  { value: 'all', label: 'Todo período' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: '6m', label: 'Últimos 6 meses' },
];

const Library = () => {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [seedFilter, setSeedFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [processedFilter, setProcessedFilter] = useState<string>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'sender' | 'seed'>('none');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);

  // Fetch seeds for filter
  const { data: seeds } = useQuery({
    queryKey: ['email-seeds-library'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_seeds')
        .select('id, name, email')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch emails with filters
  const { data: newsletters, isLoading } = useQuery({
    queryKey: ['library-emails', search, categoryFilter, seedFilter, periodFilter, processedFilter],
    queryFn: async () => {
      let query = supabase
        .from('captured_newsletters')
        .select(`
          *,
          email_seeds (
            id,
            name,
            email
          )
        `)
        .order('received_at', { ascending: false });

      // Search filter
      if (search) {
        query = query.or(`subject.ilike.%${search}%,from_email.ilike.%${search}%,from_name.ilike.%${search}%`);
      }

      // Category filter
      if (categoryFilter && categoryFilter !== 'all') {
        query = query.eq('category', categoryFilter);
      }

      // Seed filter
      if (seedFilter && seedFilter !== 'all') {
        query = query.eq('seed_id', seedFilter);
      }

      // Processed filter
      if (processedFilter === 'processed') {
        query = query.eq('is_processed', true);
      } else if (processedFilter === 'pending') {
        query = query.eq('is_processed', false);
      }

      // Period filter
      if (periodFilter !== 'all') {
        let startDate: Date;
        switch (periodFilter) {
          case '7d':
            startDate = subDays(new Date(), 7);
            break;
          case '30d':
            startDate = subDays(new Date(), 30);
            break;
          case '90d':
            startDate = subDays(new Date(), 90);
            break;
          case '6m':
            startDate = subMonths(new Date(), 6);
            break;
          default:
            startDate = new Date(0);
        }
        query = query.gte('received_at', startDate.toISOString());
      }

      const { data, error } = await query.limit(500);
      if (error) throw error;
      return data as CapturedNewsletter[];
    },
  });

  // Get unique categories from data
  const uniqueCategories = useMemo(() => {
    if (!newsletters) return [];
    const categories = new Set(newsletters.map(n => n.category).filter(Boolean));
    return Array.from(categories) as string[];
  }, [newsletters]);

  // Group emails
  const groupedEmails = useMemo(() => {
    if (!newsletters) return {};
    
    if (groupBy === 'none') {
      return { all: newsletters };
    }

    return newsletters.reduce((acc, email) => {
      let key: string;
      if (groupBy === 'sender') {
        key = email.from_name || email.from_email;
      } else {
        key = email.email_seeds?.name || 'Sem seed';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(email);
      return acc;
    }, {} as Record<string, CapturedNewsletter[]>);
  }, [newsletters, groupBy]);

  // Convert newsletter to Email type for viewer
  const convertToEmail = (newsletter: CapturedNewsletter): Email => ({
    id: newsletter.id,
    competitorId: '',
    subscriptionId: '',
    sentAt: newsletter.received_at,
    from: newsletter.from_name 
      ? `${newsletter.from_name} <${newsletter.from_email}>`
      : newsletter.from_email,
    subject: newsletter.subject,
    preheader: '',
    textBody: newsletter.text_content || '',
    htmlContent: newsletter.html_content || '',
    category: (newsletter.category || 'onboarding') as Email['category'],
    topics: [],
    ctas: Array.isArray(newsletter.ctas) ? newsletter.ctas : [],
    links: [],
    isAbVariant: false,
  });

  const getCategoryBadge = (category: string | null) => {
    if (!category) return <Badge variant="outline">Não classificado</Badge>;
    const cat = categoryLabels[category];
    if (!cat) return <Badge variant="outline">{category}</Badge>;
    return <Badge className={`${cat.color} text-white`}>{cat.label}</Badge>;
  };

  const renderEmailCard = (newsletter: CapturedNewsletter) => (
    <div 
      key={newsletter.id} 
      className="space-y-2 cursor-pointer group"
      onClick={() => setSelectedEmail(convertToEmail(newsletter))}
    >
      <div className="aspect-[3/4] rounded-lg overflow-hidden border hover:border-primary transition-all group-hover:shadow-lg">
        <EmailThumbnail
          htmlContent={newsletter.html_content}
          subject={newsletter.subject}
          onClick={() => setSelectedEmail(convertToEmail(newsletter))}
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
          {getCategoryBadge(newsletter.category)}
          {newsletter.is_processed && (
            <Badge variant="outline" className="text-xs bg-success/10 text-success border-success/20">
              Processado
            </Badge>
          )}
        </div>
        <h4 className="text-sm font-medium line-clamp-2 leading-tight">{newsletter.subject}</h4>
        <p className="text-xs text-muted-foreground truncate">{newsletter.from_name || newsletter.from_email}</p>
        <p className="text-xs text-muted-foreground">
          {format(new Date(newsletter.received_at), "dd MMM yyyy", { locale: ptBR })}
        </p>
      </div>
    </div>
  );

  const renderEmailList = (newsletter: CapturedNewsletter) => (
    <Card 
      key={newsletter.id} 
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setSelectedEmail(convertToEmail(newsletter))}
    >
      <CardContent className="py-4">
        <div className="flex items-start gap-4">
          <div className="w-20 h-28 rounded overflow-hidden border flex-shrink-0">
            <EmailThumbnail
              htmlContent={newsletter.html_content}
              subject={newsletter.subject}
              onClick={() => setSelectedEmail(convertToEmail(newsletter))}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {getCategoryBadge(newsletter.category)}
              {newsletter.email_type && (
                <Badge variant="outline">{newsletter.email_type}</Badge>
              )}
              {newsletter.is_processed && (
                <Badge variant="outline" className="text-success border-success">Processado</Badge>
              )}
            </div>
            <h3 className="font-semibold truncate">{newsletter.subject}</h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
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
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderOpen className="h-8 w-8" />
            Biblioteca
          </h1>
          <p className="text-muted-foreground mt-1">
            Busque e explore todos os e-mails coletados, agrupados por remetentes ou seeds
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Agrupar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Sem agrupamento</SelectItem>
              <SelectItem value="sender">Por remetente</SelectItem>
              <SelectItem value="seed">Por seed</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por assunto, remetente..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-44">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {Object.entries(categoryLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={seedFilter} onValueChange={setSeedFilter}>
              <SelectTrigger className="w-full md:w-44">
                <Mail className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Seed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os seeds</SelectItem>
                {seeds?.map((seed) => (
                  <SelectItem key={seed.id} value={seed.id}>{seed.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full md:w-44">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={processedFilter} onValueChange={setProcessedFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="processed">Processados</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      {newsletters && newsletters.length > 0 && (
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{newsletters.length} e-mails encontrados</span>
          {groupBy !== 'none' && (
            <span>• {Object.keys(groupedEmails).length} grupos</span>
          )}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !newsletters || newsletters.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            {search ? 'Nenhum e-mail encontrado' : 'Nenhum e-mail na biblioteca ainda'}
          </p>
        </div>
      ) : groupBy === 'none' ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {newsletters.map(renderEmailCard)}
          </div>
        ) : (
          <div className="space-y-3">
            {newsletters.map(renderEmailList)}
          </div>
        )
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedEmails)
            .sort((a, b) => b[1].length - a[1].length)
            .map(([groupName, emails]) => (
              <div key={groupName}>
                <div className="flex items-center gap-3 mb-4">
                  <h2 className="text-xl font-semibold">{groupName}</h2>
                  <Badge variant="secondary">{emails.length} emails</Badge>
                </div>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {emails.slice(0, 10).map(renderEmailCard)}
                    {emails.length > 10 && (
                      <div className="aspect-[3/4] rounded-lg border border-dashed flex items-center justify-center">
                        <span className="text-muted-foreground">+{emails.length - 10} mais</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {emails.slice(0, 5).map(renderEmailList)}
                    {emails.length > 5 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        +{emails.length - 5} emails neste grupo
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
        </div>
      )}

      <EmailViewer 
        email={selectedEmail}
        open={!!selectedEmail}
        onOpenChange={(open) => !open && setSelectedEmail(null)}
      />
    </div>
  );
};

export default Library;
