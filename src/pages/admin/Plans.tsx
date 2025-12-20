import { useState } from 'react';
import { 
  Crown, 
  Plus, 
  Edit, 
  Trash2, 
  Check,
  Users,
  Mail,
  FileText,
  Inbox
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
import { toast } from '@/hooks/use-toast';

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: 'monthly' | 'yearly';
  limits: {
    aliases: number;
    emailsPerMonth: number;
    reports: number;
    users: number;
  };
  features: string[];
  isActive: boolean;
  subscribersCount: number;
}

const mockPlans: Plan[] = [
  {
    id: '1',
    name: 'Basic',
    price: 49,
    interval: 'monthly',
    limits: {
      aliases: 5,
      emailsPerMonth: 500,
      reports: 2,
      users: 1
    },
    features: ['5 aliases de captura', '500 emails/mês', '2 relatórios/mês', 'Suporte por email'],
    isActive: true,
    subscribersCount: 45
  },
  {
    id: '2',
    name: 'Pro',
    price: 149,
    interval: 'monthly',
    limits: {
      aliases: 25,
      emailsPerMonth: 5000,
      reports: 10,
      users: 5
    },
    features: ['25 aliases de captura', '5.000 emails/mês', '10 relatórios/mês', 'API Access', 'Suporte prioritário'],
    isActive: true,
    subscribersCount: 28
  },
  {
    id: '3',
    name: 'Enterprise',
    price: 499,
    interval: 'monthly',
    limits: {
      aliases: -1,
      emailsPerMonth: -1,
      reports: -1,
      users: -1
    },
    features: ['Aliases ilimitados', 'Emails ilimitados', 'Relatórios ilimitados', 'API Access', 'Suporte dedicado', 'Onboarding personalizado'],
    isActive: true,
    subscribersCount: 8
  }
];

export default function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>(mockPlans);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    aliases: 5,
    emailsPerMonth: 500,
    reports: 2,
    users: 1,
    isActive: true
  });

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price: plan.price,
      aliases: plan.limits.aliases,
      emailsPerMonth: plan.limits.emailsPerMonth,
      reports: plan.limits.reports,
      users: plan.limits.users,
      isActive: plan.isActive
    });
    setIsFormOpen(true);
  };

  const handleNewPlan = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      price: 0,
      aliases: 5,
      emailsPerMonth: 500,
      reports: 2,
      users: 1,
      isActive: true
    });
    setIsFormOpen(true);
  };

  const handleSave = () => {
    if (editingPlan) {
      setPlans(plans.map(p => 
        p.id === editingPlan.id 
          ? { 
              ...p, 
              name: formData.name, 
              price: formData.price,
              limits: {
                aliases: formData.aliases,
                emailsPerMonth: formData.emailsPerMonth,
                reports: formData.reports,
                users: formData.users
              },
              isActive: formData.isActive
            } 
          : p
      ));
      toast({ title: 'Plano atualizado', description: 'As alterações foram salvas.' });
    } else {
      const newPlan: Plan = {
        id: Date.now().toString(),
        name: formData.name,
        price: formData.price,
        interval: 'monthly',
        limits: {
          aliases: formData.aliases,
          emailsPerMonth: formData.emailsPerMonth,
          reports: formData.reports,
          users: formData.users
        },
        features: [],
        isActive: formData.isActive,
        subscribersCount: 0
      };
      setPlans([...plans, newPlan]);
      toast({ title: 'Plano criado', description: 'O novo plano foi adicionado.' });
    }
    setIsFormOpen(false);
  };

  const handleDelete = (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan && plan.subscribersCount > 0) {
      toast({ 
        title: 'Não é possível excluir', 
        description: 'Este plano possui assinantes ativos.',
        variant: 'destructive'
      });
      return;
    }
    setPlans(plans.filter(p => p.id !== planId));
    toast({ title: 'Plano excluído', description: 'O plano foi removido.' });
  };

  const formatLimit = (value: number) => value === -1 ? 'Ilimitado' : value.toLocaleString('pt-BR');

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
            <p className="text-3xl font-bold">{plans.filter(p => p.isActive).length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Assinantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{plans.reduce((acc, p) => acc + p.subscribersCount, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={!plan.isActive ? 'opacity-60' : ''}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {!plan.isActive && (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    <span className="text-3xl font-bold text-foreground">
                      R$ {plan.price}
                    </span>
                    <span className="text-muted-foreground">/mês</span>
                  </CardDescription>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleDelete(plan.id)}
                    disabled={plan.subscribersCount > 0}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                  <span>{formatLimit(plan.limits.aliases)} aliases</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{formatLimit(plan.limits.emailsPerMonth)} emails</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{formatLimit(plan.limits.reports)} relatórios</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{formatLimit(plan.limits.users)} usuários</span>
                </div>
              </div>

              {/* Features */}
              <div className="space-y-2 pt-4 border-t">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              {/* Subscribers */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  {plan.subscribersCount} assinante{plan.subscribersCount !== 1 ? 's' : ''}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Plan Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlan ? 'Editar Plano' : 'Novo Plano'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes e limites do plano
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
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
              <Label htmlFor="price">Preço Mensal (R$)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="aliases">Limite de Aliases</Label>
                <Input
                  id="aliases"
                  type="number"
                  value={formData.aliases}
                  onChange={(e) => setFormData({ ...formData, aliases: Number(e.target.value) })}
                />
                <p className="text-xs text-muted-foreground">-1 para ilimitado</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emails">Emails/Mês</Label>
                <Input
                  id="emails"
                  type="number"
                  value={formData.emailsPerMonth}
                  onChange={(e) => setFormData({ ...formData, emailsPerMonth: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reports">Relatórios/Mês</Label>
                <Input
                  id="reports"
                  type="number"
                  value={formData.reports}
                  onChange={(e) => setFormData({ ...formData, reports: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="users">Limite de Usuários</Label>
                <Input
                  id="users"
                  type="number"
                  value={formData.users}
                  onChange={(e) => setFormData({ ...formData, users: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="active">Plano Ativo</Label>
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}