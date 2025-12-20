import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Crown, 
  CreditCard, 
  Calendar, 
  CheckCircle,
  Clock,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Ban,
  History,
  ArrowUpCircle,
  ArrowDownCircle,
  Repeat
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { RoleGuard } from '@/components/RoleGuard';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-700 border-green-500/20',
  canceled: 'bg-red-500/10 text-red-700 border-red-500/20',
  past_due: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  trialing: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  canceled: 'Cancelado',
  past_due: 'Inadimplente',
  trialing: 'Teste'
};

const paymentStatusColors: Record<string, string> = {
  paid: 'bg-green-500/10 text-green-700 border-green-500/20',
  pending: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
  failed: 'bg-red-500/10 text-red-700 border-red-500/20',
  refunded: 'bg-purple-500/10 text-purple-700 border-purple-500/20'
};

const paymentStatusLabels: Record<string, string> = {
  paid: 'Pago',
  pending: 'Pendente',
  failed: 'Falhou',
  refunded: 'Reembolsado'
};

const changeTypeColors: Record<string, string> = {
  upgrade: 'bg-green-500/10 text-green-700 border-green-500/20',
  downgrade: 'bg-orange-500/10 text-orange-700 border-orange-500/20',
  initial: 'bg-blue-500/10 text-blue-700 border-blue-500/20'
};

const changeTypeLabels: Record<string, string> = {
  upgrade: 'Upgrade',
  downgrade: 'Downgrade',
  initial: 'Inicial'
};

export default function ClientDetails() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showReactivateDialog, setShowReactivateDialog] = useState(false);
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [changeReason, setChangeReason] = useState('');

  // Fetch subscription details
  const { data: subscription, isLoading: loadingSubscription } = useQuery({
    queryKey: ['client-subscription', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID not provided');
      
      const { data, error } = await supabase
        .from('saas_subscriptions')
        .select(`
          *,
          saas_plans(id, name, price_monthly, price_yearly, features)
        `)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch user profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['client-profile', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID not provided');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!userId
  });

  // Fetch available plans
  const { data: plans } = useQuery({
    queryKey: ['available-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;
      return data || [];
    }
  });

  // Fetch payment history
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['client-payments', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID not provided');
      
      const { data, error } = await supabase
        .from('saas_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Fetch data leak alerts for this user
  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['client-alerts', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID not provided');
      
      const { data, error } = await supabase
        .from('data_leak_alerts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Fetch plan change history
  const { data: planChanges, isLoading: loadingPlanChanges } = useQuery({
    queryKey: ['client-plan-changes', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID not provided');
      
      const { data, error } = await supabase
        .from('plan_change_history')
        .select(`
          *,
          from_plan:from_plan_id(id, name, price_monthly),
          to_plan:to_plan_id(id, name, price_monthly)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.id) throw new Error('No subscription found');
      
      const { error } = await supabase
        .from('saas_subscriptions')
        .update({ 
          status: 'canceled',
          canceled_at: new Date().toISOString()
        })
        .eq('id', subscription.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-subscription', userId] });
      toast.success('Assinatura cancelada com sucesso');
      setShowCancelDialog(false);
    },
    onError: (error) => {
      toast.error('Erro ao cancelar assinatura: ' + error.message);
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.id) throw new Error('No subscription found');
      
      const { error } = await supabase
        .from('saas_subscriptions')
        .update({ 
          status: 'active',
          canceled_at: null
        })
        .eq('id', subscription.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-subscription', userId] });
      toast.success('Assinatura reativada com sucesso');
      setShowReactivateDialog(false);
    },
    onError: (error) => {
      toast.error('Erro ao reativar assinatura: ' + error.message);
    }
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async () => {
      if (!subscription?.id || !selectedPlanId || !userId) {
        throw new Error('Missing required data');
      }

      const currentPlan = subscription.saas_plans as any;
      const newPlan = plans?.find(p => p.id === selectedPlanId);
      
      if (!newPlan) throw new Error('Plan not found');

      const currentPrice = Number(currentPlan?.price_monthly || 0);
      const newPrice = Number(newPlan.price_monthly);
      const changeType = newPrice > currentPrice ? 'upgrade' : newPrice < currentPrice ? 'downgrade' : 'upgrade';

      // Update subscription
      const { error: subError } = await supabase
        .from('saas_subscriptions')
        .update({ plan_id: selectedPlanId })
        .eq('id', subscription.id);
      
      if (subError) throw subError;

      // Record the change
      const { error: historyError } = await supabase
        .from('plan_change_history')
        .insert({
          user_id: userId,
          subscription_id: subscription.id,
          from_plan_id: currentPlan?.id || null,
          to_plan_id: selectedPlanId,
          change_type: changeType,
          from_price: currentPrice,
          to_price: newPrice,
          reason: changeReason || null,
          changed_by: user?.id || null
        });

      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['client-subscription', userId] });
      queryClient.invalidateQueries({ queryKey: ['client-plan-changes', userId] });
      toast.success('Plano alterado com sucesso');
      setShowChangePlanDialog(false);
      setSelectedPlanId('');
      setChangeReason('');
    },
    onError: (error) => {
      toast.error('Erro ao alterar plano: ' + error.message);
    }
  });

  const isLoading = loadingSubscription || loadingProfile || loadingPayments;

  // Calculate total paid
  const totalPaid = payments
    ?.filter(p => p.status === 'paid')
    .reduce((acc, p) => acc + Number(p.amount), 0) || 0;

  if (isLoading) {
    return (
      <RoleGuard requiredRole="adminsaas">
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </RoleGuard>
    );
  }

  const currentPlanId = (subscription?.saas_plans as any)?.id;

  return (
    <RoleGuard requiredRole="adminsaas">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/clients')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold">
              {profile?.full_name || 'Cliente sem nome'}
            </h1>
            <p className="text-muted-foreground text-sm">
              {userId}
            </p>
          </div>
          <div className="flex gap-2">
            {subscription && (
              <Button variant="outline" onClick={() => setShowChangePlanDialog(true)}>
                <Repeat className="h-4 w-4 mr-2" />
                Alterar Plano
              </Button>
            )}
            {subscription?.status === 'active' ? (
              <Button variant="destructive" onClick={() => setShowCancelDialog(true)}>
                <Ban className="h-4 w-4 mr-2" />
                Cancelar Assinatura
              </Button>
            ) : subscription?.status === 'canceled' ? (
              <Button variant="default" onClick={() => setShowReactivateDialog(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reativar Assinatura
              </Button>
            ) : null}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {/* Subscription Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent>
              {subscription ? (
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {(subscription.saas_plans as any)?.name || 'Sem plano'}
                  </div>
                  <Badge variant="outline" className={statusColors[subscription.status]}>
                    {statusLabels[subscription.status] || subscription.status}
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    {subscription.billing_cycle === 'yearly' ? 'Cobrança anual' : 'Cobrança mensal'}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">Sem assinatura ativa</p>
              )}
            </CardContent>
          </Card>

          {/* Value Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                Valor Total Pago
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-sm text-muted-foreground">
                {payments?.filter(p => p.status === 'paid').length || 0} pagamentos
              </p>
            </CardContent>
          </Card>

          {/* Member Since Card */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                Cliente desde
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {subscription 
                  ? format(new Date(subscription.created_at), 'dd/MM/yyyy', { locale: ptBR })
                  : profile
                    ? format(new Date(profile.created_at), 'dd/MM/yyyy', { locale: ptBR })
                    : '-'
                }
              </div>
              <p className="text-sm text-muted-foreground">
                {subscription && subscription.current_period_end && (
                  <>Renova em {format(new Date(subscription.current_period_end), 'dd/MM/yyyy', { locale: ptBR })}</>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Plan Change History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Mudanças de Plano
            </CardTitle>
            <CardDescription>
              Todas as alterações de plano realizadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPlanChanges ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
              </div>
            ) : planChanges && planChanges.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>De</TableHead>
                    <TableHead>Para</TableHead>
                    <TableHead>Diferença</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {planChanges.map((change: any) => {
                    const priceDiff = Number(change.to_price || 0) - Number(change.from_price || 0);
                    return (
                      <TableRow key={change.id}>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(change.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={changeTypeColors[change.change_type]}>
                            {change.change_type === 'upgrade' ? (
                              <ArrowUpCircle className="h-3 w-3 mr-1" />
                            ) : change.change_type === 'downgrade' ? (
                              <ArrowDownCircle className="h-3 w-3 mr-1" />
                            ) : null}
                            {changeTypeLabels[change.change_type] || change.change_type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {change.from_plan?.name || '-'}
                        </TableCell>
                        <TableCell className="font-medium">
                          {change.to_plan?.name || '-'}
                        </TableCell>
                        <TableCell className={priceDiff > 0 ? 'text-green-600' : priceDiff < 0 ? 'text-orange-600' : ''}>
                          {priceDiff !== 0 ? (
                            <>
                              {priceDiff > 0 ? '+' : ''}R$ {priceDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {change.reason || '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma mudança de plano registrada</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Histórico de Pagamentos
            </CardTitle>
            <CardDescription>
              Todos os pagamentos realizados pelo cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {payments && payments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>ID Externo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        R$ {Number(payment.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={paymentStatusColors[payment.status]}>
                          {paymentStatusLabels[payment.status] || payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.payment_method || '-'}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.external_id ? payment.external_id.slice(0, 12) + '...' : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pagamento encontrado</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Data Leak Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas de Vazamento
            </CardTitle>
            <CardDescription>
              Últimos alertas de vazamento de dados do cliente
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts && alerts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Email Remetente</TableHead>
                    <TableHead>Domínio Detectado</TableHead>
                    <TableHead>Severidade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        {format(new Date(alert.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="font-medium">
                        {alert.from_email}
                      </TableCell>
                      <TableCell>
                        {alert.actual_domain}
                      </TableCell>
                      <TableCell>
                        <Badge variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}>
                          {alert.severity || 'warning'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {alert.is_notified ? (
                          <Badge variant="outline" className="bg-green-500/10 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Notificado
                          </Badge>
                        ) : alert.is_read ? (
                          <Badge variant="outline">Lido</Badge>
                        ) : (
                          <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum alerta de vazamento</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancel Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá cancelar a assinatura do cliente. O acesso será mantido até o fim do período atual.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => cancelMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Confirmar Cancelamento
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Reactivate Dialog */}
        <AlertDialog open={showReactivateDialog} onOpenChange={setShowReactivateDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reativar assinatura?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá reativar a assinatura do cliente imediatamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Voltar</AlertDialogCancel>
              <AlertDialogAction onClick={() => reactivateMutation.mutate()}>
                Confirmar Reativação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Plan Dialog */}
        <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Alterar Plano</DialogTitle>
              <DialogDescription>
                Selecione o novo plano para o cliente. A mudança será registrada no histórico.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Novo Plano</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans?.filter(p => p.id !== currentPlanId).map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        <div className="flex items-center gap-2">
                          <span>{plan.name}</span>
                          <span className="text-muted-foreground">
                            - R$ {Number(plan.price_monthly).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Motivo da mudança (opcional)</Label>
                <Textarea 
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  placeholder="Ex: Solicitação do cliente, promoção especial..."
                  rows={3}
                />
              </div>

              {selectedPlanId && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Plano atual:</strong> {(subscription?.saas_plans as any)?.name || 'Nenhum'} 
                    {' '}- R$ {Number((subscription?.saas_plans as any)?.price_monthly || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </p>
                  <p className="text-sm mt-1">
                    <strong>Novo plano:</strong> {plans?.find(p => p.id === selectedPlanId)?.name}
                    {' '}- R$ {Number(plans?.find(p => p.id === selectedPlanId)?.price_monthly || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={() => changePlanMutation.mutate()}
                disabled={!selectedPlanId || changePlanMutation.isPending}
              >
                {changePlanMutation.isPending ? 'Alterando...' : 'Confirmar Alteração'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </RoleGuard>
  );
}
