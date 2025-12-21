import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  Eye, 
  Download,
  Users
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  trialing: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  canceled: 'bg-gray-500/10 text-gray-700 border-gray-500/20',
  past_due: 'bg-red-500/10 text-red-700 border-red-500/20',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  trialing: 'Teste',
  canceled: 'Cancelado',
  past_due: 'Atrasado',
};

interface ClientData {
  user_id: string;
  status: string;
  created_at: string;
  current_period_end: string | null;
  plan_name: string | null;
  plan_price: number | null;
  full_name: string | null;
}

export default function Clients() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [selectedClient, setSelectedClient] = useState<ClientData | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Fetch clients from real data (subscriptions + profiles separately)
  const { data: clients, isLoading } = useQuery({
    queryKey: ['admin-clients', search, statusFilter],
    queryFn: async () => {
      // Get subscriptions with plans
      let query = supabase
        .from('saas_subscriptions')
        .select(`
          user_id,
          status,
          created_at,
          current_period_end,
          plan:saas_plans(name, price_monthly)
        `)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }

      const { data: subscriptions, error: subError } = await query;
      if (subError) throw subError;

      if (!subscriptions?.length) return [];

      // Get profiles for all user_ids
      const userIds = subscriptions.map(s => s.user_id);
      const { data: profiles, error: profError } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', userIds);

      if (profError) throw profError;

      // Merge data
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.full_name]) || []);

      let merged: ClientData[] = subscriptions.map(sub => ({
        user_id: sub.user_id,
        status: sub.status,
        created_at: sub.created_at,
        current_period_end: sub.current_period_end,
        plan_name: sub.plan?.name || null,
        plan_price: sub.plan?.price_monthly || null,
        full_name: profileMap.get(sub.user_id) || null,
      }));

      // Filter by search if provided
      if (search) {
        const searchLower = search.toLowerCase();
        merged = merged.filter(c => 
          c.full_name?.toLowerCase().includes(searchLower) ||
          c.user_id.toLowerCase().includes(searchLower)
        );
      }

      return merged;
    },
  });

  const handleViewClient = (client: ClientData) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleExport = () => {
    if (!clients?.length) {
      toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
      return;
    }

    const csvContent = [
      ['ID', 'Nome', 'Status', 'Plano', 'Criado em'].join(','),
      ...clients.map(c => [
        c.user_id,
        c.full_name || 'Sem nome',
        statusLabels[c.status] || c.status,
        c.plan_name || 'Sem plano',
        format(new Date(c.created_at), 'dd/MM/yyyy')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    
    toast({ title: 'Exportação concluída' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e assinaturas
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="trialing">Teste</SelectItem>
                <SelectItem value="canceled">Cancelado</SelectItem>
                <SelectItem value="past_due">Atrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : clients?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhum cliente encontrado
              </h3>
              <p className="text-muted-foreground">
                Nenhuma assinatura encontrada com os filtros selecionados.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Membro desde</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients?.map((client) => (
                  <TableRow key={client.user_id}>
                    <TableCell className="font-medium">
                      {client.full_name || 'Sem nome'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {client.plan_name || 'Sem plano'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[client.status] || ''}>
                        {statusLabels[client.status] || client.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(client.created_at), "dd 'de' MMM, yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewClient(client)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Client Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {(selectedClient.full_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">
                      {selectedClient.full_name || 'Sem nome'}
                    </SheetTitle>
                    <SheetDescription>
                      ID: {selectedClient.user_id.slice(0, 8)}...
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="resumo" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="assinatura">Assinatura</TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-muted-foreground">Nome</Label>
                      <p className="text-lg">{selectedClient.full_name || 'Não informado'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-base px-3 py-1 ${statusColors[selectedClient.status] || ''}`}
                        >
                          {statusLabels[selectedClient.status] || selectedClient.status}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Membro desde</Label>
                      <p className="text-lg">
                        {format(new Date(selectedClient.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="assinatura" className="space-y-4 mt-4">
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-muted-foreground">Plano Atual</Label>
                      <p className="text-lg font-medium">{selectedClient.plan_name || 'Sem plano'}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Valor Mensal</Label>
                      <p className="text-lg">
                        {selectedClient.plan_price 
                          ? `R$ ${selectedClient.plan_price.toFixed(2)}`
                          : 'Gratuito'}
                      </p>
                    </div>
                    {selectedClient.current_period_end && (
                      <div>
                        <Label className="text-muted-foreground">Próxima Renovação</Label>
                        <p className="text-lg">
                          {format(new Date(selectedClient.current_period_end), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}