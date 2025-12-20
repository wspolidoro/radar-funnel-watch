import { useState } from 'react';
import { 
  CreditCard, 
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Calendar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  clientName: string;
  clientEmail: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  plan: string;
  createdAt: string;
  paidAt?: string;
  method: 'credit_card' | 'pix' | 'boleto';
}

const mockPayments: Payment[] = [
  {
    id: 'pay_1',
    clientName: 'Tech Solutions Ltda',
    clientEmail: 'financeiro@techsolutions.com',
    amount: 149,
    status: 'paid',
    plan: 'Pro',
    createdAt: '2024-01-15T10:30:00Z',
    paidAt: '2024-01-15T10:32:00Z',
    method: 'credit_card'
  },
  {
    id: 'pay_2',
    clientName: 'Marketing Digital SA',
    clientEmail: 'pagamentos@marketingdigital.com',
    amount: 499,
    status: 'paid',
    plan: 'Enterprise',
    createdAt: '2024-01-14T14:20:00Z',
    paidAt: '2024-01-14T14:22:00Z',
    method: 'pix'
  },
  {
    id: 'pay_3',
    clientName: 'Startup XYZ',
    clientEmail: 'admin@startupxyz.io',
    amount: 49,
    status: 'pending',
    plan: 'Basic',
    createdAt: '2024-01-16T09:00:00Z',
    method: 'boleto'
  },
  {
    id: 'pay_4',
    clientName: 'E-commerce Brasil',
    clientEmail: 'finance@ecommercebr.com',
    amount: 149,
    status: 'failed',
    plan: 'Pro',
    createdAt: '2024-01-13T16:45:00Z',
    method: 'credit_card'
  },
  {
    id: 'pay_5',
    clientName: 'Agência Criativa',
    clientEmail: 'contato@agenciacriativa.com',
    amount: 49,
    status: 'refunded',
    plan: 'Basic',
    createdAt: '2024-01-10T11:00:00Z',
    paidAt: '2024-01-10T11:02:00Z',
    method: 'credit_card'
  }
];

const statusConfig = {
  paid: { label: 'Pago', color: 'bg-green-500/10 text-green-700 border-green-500/20', icon: CheckCircle },
  pending: { label: 'Pendente', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20', icon: Clock },
  failed: { label: 'Falhou', color: 'bg-red-500/10 text-red-700 border-red-500/20', icon: XCircle },
  refunded: { label: 'Reembolsado', color: 'bg-gray-500/10 text-gray-700 border-gray-500/20', icon: XCircle }
};

const methodLabels = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto'
};

export default function AdminPayments() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [periodFilter, setPeriodFilter] = useState('30d');

  const filteredPayments = mockPayments.filter(payment => {
    const matchesSearch = 
      payment.clientName.toLowerCase().includes(search.toLowerCase()) ||
      payment.clientEmail.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'todos' || payment.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    totalRevenue: mockPayments
      .filter(p => p.status === 'paid')
      .reduce((acc, p) => acc + p.amount, 0),
    pendingAmount: mockPayments
      .filter(p => p.status === 'pending')
      .reduce((acc, p) => acc + p.amount, 0),
    transactionsCount: mockPayments.length,
    successRate: Math.round(
      (mockPayments.filter(p => p.status === 'paid').length / mockPayments.length) * 100
    )
  };

  const handleExport = () => {
    const csv = 'ID,Cliente,Email,Valor,Status,Plano,Data,Método\n' +
      filteredPayments.map(p => 
        `${p.id},"${p.clientName}",${p.clientEmail},${p.amount},${statusConfig[p.status].label},${p.plan},${new Date(p.createdAt).toLocaleDateString('pt-BR')},${methodLabels[p.method]}`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pagamentos-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: 'Exportação concluída' });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8 text-primary" />
            Pagamentos
          </h1>
          <p className="text-muted-foreground">
            Gerencie transações e faturamento
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              R$ {stats.totalRevenue.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pendente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              R$ {stats.pendingAmount.toLocaleString('pt-BR')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.transactionsCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Taxa de Sucesso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.successRate}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente ou email..."
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
                <SelectItem value="paid">Pagos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="refunded">Reembolsados</SelectItem>
              </SelectContent>
            </Select>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="90d">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todo período</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transações</CardTitle>
          <CardDescription>
            {filteredPayments.length} transação{filteredPayments.length !== 1 ? 'ões' : ''} encontrada{filteredPayments.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => {
                const StatusIcon = statusConfig[payment.status].icon;
                return (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{payment.clientName}</span>
                        <span className="text-xs text-muted-foreground">{payment.clientEmail}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{payment.plan}</Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      R$ {payment.amount.toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {methodLabels[payment.method]}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusConfig[payment.status].color}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[payment.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatDate(payment.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}