import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Plus, 
  Eye, 
  Edit, 
  PauseCircle, 
  Download,
  BarChart3,
  FileText,
  TrendingUp
} from 'lucide-react';
import { clientService } from '@/services/api';
import type { Client, ClientStatus, ClientPlan } from '@/types';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';

const statusColors: Record<ClientStatus, string> = {
  ativo: 'bg-green-500/10 text-green-700 border-green-500/20',
  teste: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  inativo: 'bg-gray-500/10 text-gray-700 border-gray-500/20'
};

const statusLabels: Record<ClientStatus, string> = {
  ativo: 'Ativo',
  teste: 'Teste',
  inativo: 'Inativo'
};

const planLabels: Record<ClientPlan, string> = {
  basic: 'Basic',
  pro: 'Pro',
  enterprise: 'Enterprise'
};

export default function Clients() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [planFilter, setPlanFilter] = useState('todos');
  const [page, setPage] = useState(1);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Client>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search, statusFilter, planFilter, page],
    queryFn: () => clientService.list({
      search,
      status: statusFilter,
      plano: planFilter,
      page,
      pageSize: 10
    })
  });

  const createMutation = useMutation({
    mutationFn: clientService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente criado',
        description: 'O cliente foi adicionado com sucesso.'
      });
      setIsFormOpen(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente atualizado',
        description: 'As informações foram salvas com sucesso.'
      });
      setIsFormOpen(false);
      setIsEditing(false);
      setFormData({});
    }
  });

  const suspendMutation = useMutation({
    mutationFn: clientService.suspend,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast({
        title: 'Cliente suspendido',
        description: 'O cliente foi marcado como inativo.'
      });
      setIsDetailsOpen(false);
    }
  });

  const exportMutation = useMutation({
    mutationFn: clientService.exportCSV,
    onSuccess: (csvData) => {
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clientes-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      toast({
        title: 'Exportação concluída',
        description: 'O arquivo CSV foi gerado com sucesso.'
      });
    }
  });

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setIsDetailsOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setFormData(client);
    setIsEditing(true);
    setIsFormOpen(true);
  };

  const handleNewClient = () => {
    setFormData({
      status: 'teste',
      plano: 'basic'
    });
    setIsEditing(false);
    setIsFormOpen(true);
  };

  const handleSaveClient = () => {
    if (isEditing && formData.id) {
      updateMutation.mutate({ id: formData.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleSuspend = () => {
    if (selectedClient) {
      suspendMutation.mutate(selectedClient.id);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie seus clientes e seus planos
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportMutation.mutate()}>
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button onClick={handleNewClient}>
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar cliente por nome ou e-mail..."
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
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="teste">Teste</SelectItem>
                <SelectItem value="inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
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
          ) : data?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-muted p-6 mb-4">
                <Users className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Nenhum cliente encontrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Nenhum cliente cadastrado ainda. Clique em "Novo Cliente" para começar.
              </p>
              <Button onClick={handleNewClient}>
                <Plus className="h-4 w-4" />
                Novo Cliente
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome da Empresa</TableHead>
                    <TableHead>Responsável / E-mail</TableHead>
                    <TableHead>Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.data.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell className="font-medium">{client.nome}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm">{client.responsavel}</span>
                          <span className="text-xs text-muted-foreground">
                            {client.email}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{planLabels[client.plano]}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[client.status]}>
                          {statusLabels[client.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(client.criadoEm).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewClient(client)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClient(client)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {client.status !== 'inativo' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client);
                                suspendMutation.mutate(client.id);
                              }}
                            >
                              <PauseCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="border-t p-4">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setPage(Math.max(1, page - 1))}
                          className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                      {[...Array(totalPages)].map((_, i) => (
                        <PaginationItem key={i}>
                          <PaginationLink
                            onClick={() => setPage(i + 1)}
                            isActive={page === i + 1}
                            className="cursor-pointer"
                          >
                            {i + 1}
                          </PaginationLink>
                        </PaginationItem>
                      ))}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setPage(Math.min(totalPages, page + 1))}
                          className={page === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Client Details Sheet */}
      <Sheet open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedClient && (
            <>
              <SheetHeader>
                <div className="flex items-center gap-4 mb-4">
                  <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">
                      {selectedClient.nome.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <SheetTitle className="text-2xl">{selectedClient.nome}</SheetTitle>
                    <SheetDescription>{selectedClient.dominio}</SheetDescription>
                  </div>
                </div>
              </SheetHeader>

              <Tabs defaultValue="resumo" className="mt-6">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="resumo">Resumo</TabsTrigger>
                  <TabsTrigger value="uso">Uso</TabsTrigger>
                  <TabsTrigger value="historico">Histórico</TabsTrigger>
                </TabsList>

                <TabsContent value="resumo" className="space-y-4">
                  <div className="grid gap-4">
                    <div>
                      <Label className="text-muted-foreground">Responsável</Label>
                      <p className="text-lg">{selectedClient.responsavel}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">E-mail</Label>
                      <p className="text-lg">{selectedClient.email}</p>
                    </div>
                    {selectedClient.telefone && (
                      <div>
                        <Label className="text-muted-foreground">Telefone</Label>
                        <p className="text-lg">{selectedClient.telefone}</p>
                      </div>
                    )}
                    <div>
                      <Label className="text-muted-foreground">Plano Atual</Label>
                      <div className="mt-1">
                        <Badge variant="outline" className="text-base px-3 py-1">
                          {planLabels[selectedClient.plano]}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge 
                          variant="outline" 
                          className={`text-base px-3 py-1 ${statusColors[selectedClient.status]}`}
                        >
                          {statusLabels[selectedClient.status]}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline" className="flex-1">
                      <BarChart3 className="h-4 w-4" />
                      Alterar Plano
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4" />
                      Gerar Relatório
                    </Button>
                  </div>
                  
                  {selectedClient.status !== 'inativo' && (
                    <Button 
                      variant="destructive" 
                      className="w-full"
                      onClick={handleSuspend}
                    >
                      <PauseCircle className="h-4 w-4" />
                      Suspender Cliente
                    </Button>
                  )}
                </TabsContent>

                <TabsContent value="uso" className="space-y-4">
                  <div className="grid gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Concorrentes Monitorados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{selectedClient.uso.concorrentes}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          E-mails Coletados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{selectedClient.uso.emails}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Relatórios Gerados
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-3xl font-bold">{selectedClient.uso.relatorios}</p>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="historico" className="space-y-4">
                  {selectedClient.historicoPagamentos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum histórico de pagamento disponível
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClient.historicoPagamentos.map((pagamento, i) => (
                          <TableRow key={i}>
                            <TableCell>
                              {new Date(pagamento.data).toLocaleDateString('pt-BR')}
                            </TableCell>
                            <TableCell className="font-medium">{pagamento.valor}</TableCell>
                            <TableCell>
                              <Badge 
                                variant="outline" 
                                className="bg-green-500/10 text-green-700 border-green-500/20"
                              >
                                {pagamento.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Client Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription>
              {isEditing 
                ? 'Atualize as informações do cliente.' 
                : 'Preencha os dados para adicionar um novo cliente.'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Empresa</Label>
              <Input
                id="nome"
                value={formData.nome || ''}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Tech Solutions Ltda"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dominio">Domínio</Label>
              <Input
                id="dominio"
                value={formData.dominio || ''}
                onChange={(e) => setFormData({ ...formData, dominio: e.target.value })}
                placeholder="techsolutions.com.br"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={formData.responsavel || ''}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                placeholder="Maria Santos"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="maria@techsolutions.com.br"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="telefone">Telefone (opcional)</Label>
              <Input
                id="telefone"
                value={formData.telefone || ''}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 98765-4321"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="plano">Plano</Label>
              <Select 
                value={formData.plano || 'basic'} 
                onValueChange={(value) => setFormData({ ...formData, plano: value as ClientPlan })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status || 'teste'} 
                onValueChange={(value) => setFormData({ ...formData, status: value as ClientStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="teste">Teste</SelectItem>
                  <SelectItem value="inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveClient}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Mail, Users } from 'lucide-react';
