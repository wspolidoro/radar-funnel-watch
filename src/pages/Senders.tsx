import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  Download, 
  Eye,
  Mail,
  AlertTriangle,
  Inbox,
  Filter,
  ShieldAlert
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { DetectedSender } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { DetectedSenderCard } from '@/components/DetectedSenderCard';

const categoryLabels: Record<string, string> = {
  'promotional': 'Promocional',
  'transactional': 'Transacional',
  'newsletter': 'Newsletter',
  'onboarding': 'Onboarding',
  'notification': 'Notificação',
  'educational': 'Educacional',
  'unknown': 'Desconhecido'
};

// Função para extrair domínio de um email
const extractDomain = (email: string): string => {
  const parts = email.split('@');
  return parts.length > 1 ? parts[1].toLowerCase() : '';
};

// Função para verificar se o domínio do remetente corresponde ao esperado pelo alias
const checkDomainMismatch = (senderEmail: string, aliasName: string): boolean => {
  const senderDomain = extractDomain(senderEmail);
  const aliasLower = aliasName.toLowerCase();
  const aliasKeyword = aliasLower.replace(/[^a-z0-9]/g, '');
  
  if (!aliasKeyword || aliasKeyword.length < 3) return false;
  
  return !senderDomain.includes(aliasKeyword);
};

export default function Senders() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  const [aliasFilter, setAliasFilter] = useState('todos');
  const [leakFilter, setLeakFilter] = useState('todos');

  // Buscar aliases do usuário
  const { data: aliases } = useQuery({
    queryKey: ['email-aliases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_aliases')
        .select('id, alias, name, sender_name')
        .order('alias');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar remetentes detectados
  const { data: sendersData, isLoading } = useQuery({
    queryKey: ['detected-senders', categoryFilter, aliasFilter],
    queryFn: async () => {
      let query = supabase
        .from('captured_newsletters')
        .select('from_email, from_name, category, alias_id, received_at');

      if (categoryFilter !== 'todas') {
        query = query.eq('category', categoryFilter);
      }

      if (aliasFilter !== 'todos') {
        query = query.eq('alias_id', aliasFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Agregar por from_email
      const senderMap = new Map<string, {
        fromEmail: string;
        fromName: string | null;
        emailCount: number;
        lastEmailAt: string;
        firstEmailAt: string;
        categories: Set<string>;
        aliasIds: Set<string>;
      }>();

      (data || []).forEach(email => {
        const existing = senderMap.get(email.from_email);
        if (existing) {
          existing.emailCount++;
          if (email.received_at > existing.lastEmailAt) {
            existing.lastEmailAt = email.received_at;
          }
          if (email.received_at < existing.firstEmailAt) {
            existing.firstEmailAt = email.received_at;
          }
          if (email.category) existing.categories.add(email.category);
          if (email.alias_id) existing.aliasIds.add(email.alias_id);
          if (email.from_name && !existing.fromName) {
            existing.fromName = email.from_name;
          }
        } else {
          senderMap.set(email.from_email, {
            fromEmail: email.from_email,
            fromName: email.from_name,
            emailCount: 1,
            lastEmailAt: email.received_at,
            firstEmailAt: email.received_at,
            categories: new Set(email.category ? [email.category] : []),
            aliasIds: new Set(email.alias_id ? [email.alias_id] : [])
          });
        }
      });

      // Converter para array e mapear alias names
      const aliasMap = new Map((aliases || []).map(a => [a.id, a.alias]));
      
      const senders: DetectedSender[] = Array.from(senderMap.values()).map(s => {
        const aliasNames = Array.from(s.aliasIds).map(id => aliasMap.get(id) || id);
        
        // Detecção avançada de vazamento: verifica se o domínio do remetente não corresponde ao alias
        const hasDomainMismatch = aliasNames.some(aliasName => 
          checkDomainMismatch(s.fromEmail, aliasName)
        );
        
        return {
          fromEmail: s.fromEmail,
          fromName: s.fromName,
          emailCount: s.emailCount,
          lastEmailAt: s.lastEmailAt,
          firstEmailAt: s.firstEmailAt,
          categories: Array.from(s.categories),
          aliasIds: Array.from(s.aliasIds),
          aliasNames,
          isUnexpected: s.aliasIds.size > 1 || hasDomainMismatch
        };
      });

      return senders.sort((a, b) => b.emailCount - a.emailCount);
    },
    enabled: !!aliases
  });

  // Buscar categorias únicas
  const { data: categories } = useQuery({
    queryKey: ['newsletter-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('captured_newsletters')
        .select('category')
        .not('category', 'is', null);

      if (error) throw error;

      const uniqueCategories = [...new Set((data || []).map(d => d.category).filter(Boolean))];
      return uniqueCategories as string[];
    }
  });

  const filteredSenders = useMemo(() => {
    if (!sendersData) return [];
    
    let filtered = sendersData;

    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(s => 
        s.fromEmail.toLowerCase().includes(searchLower) ||
        (s.fromName && s.fromName.toLowerCase().includes(searchLower))
      );
    }

    if (leakFilter === 'suspeitos') {
      filtered = filtered.filter(s => s.isUnexpected);
    } else if (leakFilter === 'normais') {
      filtered = filtered.filter(s => !s.isUnexpected);
    }

    return filtered;
  }, [sendersData, search, leakFilter]);

  const topSenders = useMemo(() => filteredSenders.slice(0, 3), [filteredSenders]);

  const handleViewDetails = (sender: DetectedSender) => {
    navigate(`/senders/${encodeURIComponent(sender.fromEmail)}`);
  };

  const handleExport = () => {
    if (!filteredSenders.length) {
      toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
      return;
    }

    const csv = 'Email,Nome,Emails Recebidos,Categorias,Aliases,Suspeito\n' +
      filteredSenders.map(s => 
        `"${s.fromEmail}","${s.fromName || ''}",${s.emailCount},"${s.categories.join('; ')}","${s.aliasNames.join('; ')}",${s.isUnexpected ? 'Sim' : 'Não'}`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `remetentes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: 'Exportação concluída' });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });
  };

  const suspiciousSenders = useMemo(() => filteredSenders.filter(s => s.isUnexpected), [filteredSenders]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Remetentes Detectados</h1>
          <p className="text-muted-foreground">
            Remetentes identificados nos emails capturados pelos seus aliases
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Alerta de vazamento */}
      {suspiciousSenders.length > 0 && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-yellow-500/10 p-2">
                <ShieldAlert className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-700">
                  {suspiciousSenders.length} remetente{suspiciousSenders.length > 1 ? 's' : ''} com possível vazamento de dados
                </p>
                <p className="text-sm text-yellow-600/80">
                  Remetentes com domínio incompatível ou que enviaram para múltiplos aliases.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por email ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-44">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas categorias</SelectItem>
                {(categories || []).map(cat => (
                  <SelectItem key={cat} value={cat}>{categoryLabels[cat] || cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={aliasFilter} onValueChange={setAliasFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Inbox className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Alias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos aliases</SelectItem>
                {(aliases || []).map(alias => (
                  <SelectItem key={alias.id} value={alias.id}>{alias.alias}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={leakFilter} onValueChange={setLeakFilter}>
              <SelectTrigger className="w-full md:w-40">
                <AlertTriangle className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Vazamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="suspeitos">Suspeitos</SelectItem>
                <SelectItem value="normais">Normais</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      ) : filteredSenders.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Mail className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum remetente detectado</h3>
            <p className="text-muted-foreground text-center">
              Quando seus aliases receberem emails, os remetentes aparecerão aqui.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {topSenders.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Mais Ativos
              </h2>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {topSenders.map((sender) => (
                  <DetectedSenderCard key={sender.fromEmail} sender={sender} onViewDetails={handleViewDetails} />
                ))}
              </div>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Todos os Remetentes</CardTitle>
              <CardDescription>{filteredSenders.length} remetente{filteredSenders.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Remetente</TableHead>
                    <TableHead>Categorias</TableHead>
                    <TableHead className="text-right">Emails</TableHead>
                    <TableHead>Aliases</TableHead>
                    <TableHead>Último email</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSenders.map((sender) => (
                    <TableRow key={sender.fromEmail}>
                      <TableCell>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{sender.fromName || sender.fromEmail}</span>
                            {sender.isUnexpected && (
                              <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 border-yellow-500/20 text-xs">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Suspeito
                              </Badge>
                            )}
                          </div>
                          {sender.fromName && <span className="text-xs text-muted-foreground">{sender.fromEmail}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sender.categories.slice(0, 2).map(cat => (
                            <Badge key={cat} variant="secondary" className="text-xs">{categoryLabels[cat] || cat}</Badge>
                          ))}
                          {sender.categories.length > 2 && <Badge variant="outline" className="text-xs">+{sender.categories.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{sender.emailCount}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {sender.aliasNames.slice(0, 2).map(alias => (
                            <Badge key={alias} variant="outline" className="text-xs">{alias}</Badge>
                          ))}
                          {sender.aliasNames.length > 2 && <Badge variant="outline" className="text-xs">+{sender.aliasNames.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(sender.lastEmailAt)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(sender)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}