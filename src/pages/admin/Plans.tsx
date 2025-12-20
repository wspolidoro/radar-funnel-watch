import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Crown, 
  Plus, 
  Edit, 
  Trash2, 
  Check,
  Inbox,
  Star,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SaasPlan {
  id: string;
  name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number | null;
  max_aliases: number;
  max_seeds: number;
  features: string[];
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
}

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price_monthly: 0,
    price_yearly: 0,
    max_aliases: 10,
    max_seeds: 5,
    features: '',
    is_active: true,
    is_featured: false
  });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['saas-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_plans')
        .select('*')
        .order('price_monthly', { ascending: true });
      
      if (error) throw error;
      return data as SaasPlan[];
    }
  });

  const { data: subscriptionCounts = {} } = useQuery({
    queryKey: ['subscription-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saas_subscriptions')
        .select('plan_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data?.forEach(sub => {
        if (sub.plan_id) {
          counts[sub.plan_id] = (counts[sub.plan_id] || 0) + 1;
        }
      });
      return counts;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      const payload = {
        name: data.name,
        description: data.description || null,
        price_monthly: data.price_monthly,
        price_yearly: data.price_yearly || null,
        max_aliases: data.max_aliases,
        max_seeds: data.max_seeds,
        features: data.features.split('\n').filter(f => f.trim()),
        is_active: data.is_active,
        is_featured: data.is_featured
      };

      if (data.id) {
        const { error } = await supabase
          .from('saas_plans')
          .update(payload)
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('saas_plans')
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      setIsFormOpen(false);
      toast.success(editingPlan ? 'Plano atualizado' : 'Plano criado');
    },
    onError: (error) => {
      toast.error('Erro ao salvar plano: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from('saas_plans')
        .delete()
        .eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saas-plans'] });
      toast.success('Plano excluído');
    },
    onError: (error) => {
      toast.error('Erro ao excluir plano: ' + error.message);
    }
  });

  const handleEdit = (plan: SaasPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || '',
      price_monthly: plan.price_monthly,
      price_yearly: plan.price_yearly || 0,
      max_aliases: plan.max_aliases,
      max_seeds: plan.max_seeds,
      features: (plan.features || []).join('\n'),
      is_active: plan.is_active,
      is_featured: plan.is_featured
    });
    setIsFormOpen(true);
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      description: '',
      price_monthly: 0,
      price_yearly: 0,
      max_aliases: 10,
      max_seeds: 5,
      features: '',
      is_active: true,
      is_featured: false
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    saveMutation.mutate({
      ...formData,
      id: editingPlan?.id
    });
  };

  const handleDelete = (planId: string) => {
    const count = subscriptionCounts[planId] || 0;
    if (count > 0) {
      toast.error('Não é possível excluir um plano com assinantes ativos');
      return;
    }
    deleteMutation.mutate(planId);
  };

  const formatLimit = (value: number) => value === -1 ? 'Ilimitado' : value.toLocaleString('pt-BR');

  const totalSubscribers = Object.values(subscriptionCounts).reduce((acc, count) => acc + count, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Crown className="h-8 w-8 text-primary" />
            Planos
          </h1>
          <p className="text-muted-foreground">
            Gerencie os planos e limites do sistema
          </p>
        </div>
        <Button onClick={handleNewPlan}>
          <Plus className="h-4 w-4" />
          Novo Plano
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Planos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{plans.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Planos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{plans.filter(p => p.is_active).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Assinantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalSubscribers}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const subscriberCount = subscriptionCounts[plan.id] || 0;
          return (
            <Card key={plan.id} className={`relative ${!plan.is_active ? 'opacity-60' : ''}`}>
              {plan.is_featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">
                    <Star className="h-3 w-3 mr-1" />
                    Destaque
                  </Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {plan.name}
                      {!plan.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span className="text-3xl font-bold text-foreground">
                        R$ {plan.price_monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-muted-foreground">/mês</span>
                    </CardDescription>
                    {plan.price_yearly && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ou R$ {plan.price_yearly.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/ano
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDelete(plan.id)}
                      disabled={subscriberCount > 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {plan.description && (
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                )}

                {/* Limits */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    <span>{formatLimit(plan.max_aliases)} aliases</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                    <span>{formatLimit(plan.max_seeds)} seeds</span>
                  </div>
                </div>

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-2 pt-4 border-t">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Subscribers */}
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {subscriberCount} assinante{subscriberCount !== 1 ? 's' : ''}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Plan Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes e limites do plano
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Plano</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Pro"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Breve descrição do plano"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price_monthly">Preço Mensal (R$)</Label>
                <Input
                  id="price_monthly"
                  type="number"
                  step="0.01"
                  value={formData.price_monthly}
                  onChange={(e) => setFormData({ ...formData, price_monthly: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price_yearly">Preço Anual (R$)</Label>
                <Input
                  id="price_yearly"
                  type="number"
                  step="0.01"
                  value={formData.price_yearly}
                  onChange={(e) => setFormData({ ...formData, price_yearly: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_aliases">Limite de Aliases</Label>
                <Input
                  id="max_aliases"
                  type="number"
                  value={formData.max_aliases}
                  onChange={(e) => setFormData({ ...formData, max_aliases: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">-1 para ilimitado</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="max_seeds">Limite de Seeds</Label>
                <Input
                  id="max_seeds"
                  type="number"
                  value={formData.max_seeds}
                  onChange={(e) => setFormData({ ...formData, max_seeds: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="features">Recursos (um por linha)</Label>
              <Textarea
                id="features"
                value={formData.features}
                onChange={(e) => setFormData({ ...formData, features: e.target.value })}
                placeholder="Recurso 1&#10;Recurso 2&#10;Recurso 3"
                rows={4}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Plano Ativo</Label>
              <Switch
                id="active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="featured">Plano em Destaque</Label>
              <Switch
                id="featured"
                checked={formData.is_featured}
                onCheckedChange={(checked) => setFormData({ ...formData, is_featured: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
