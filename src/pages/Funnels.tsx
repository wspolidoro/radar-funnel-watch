import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  GitBranch, Eye, Download, Plus, Mail, Clock, TrendingUp, Filter, 
  Target, Loader2, Calendar, Tag, Sparkles, Palette, Pencil, Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { EmailThumbnail } from '@/components/EmailThumbnail';
import { EmailViewer } from '@/components/EmailViewer';
import { FunnelBuilder } from '@/components/FunnelBuilder';
import { format, differenceInHours, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import type { Email } from '@/types';
import { cn } from '@/lib/utils';

interface EmailFunnel {
  id: string;
  name: string;
  description: string | null;
  sender_email: string;
  sender_name: string | null;
  email_ids: string[];
  color: string;
  icon: string;
  tags: string[];
  total_emails: number;
  first_email_at: string | null;
  last_email_at: string | null;
  avg_interval_hours: number | null;
  is_active: boolean;
  created_at: string;
}

interface CapturedNewsletter {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  html_content: string | null;
  received_at: string;
  category: string | null;
  ctas: any;
}

const colorOptions = [
  { value: '#3b82f6', label: 'Azul' },
  { value: '#10b981', label: 'Verde' },
  { value: '#f59e0b', label: 'Amarelo' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#8b5cf6', label: 'Roxo' },
  { value: '#ec4899', label: 'Rosa' },
  { value: '#06b6d4', label: 'Ciano' },
];

const categoryColors: Record<string, string> = {
  onboarding: 'border-blue-500/40 shadow-blue-500/20',
  educacao: 'border-green-500/40 shadow-green-500/20',
  promo: 'border-red-500/40 shadow-red-500/20',
  reengajamento: 'border-orange-500/40 shadow-orange-500/20',
  sazonal: 'border-purple-500/40 shadow-purple-500/20',
  newsletter: 'border-cyan-500/40 shadow-cyan-500/20',
};

const Funnels = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFunnel, setSelectedFunnel] = useState<EmailFunnel | null>(null);
  const [viewingEmail, setViewingEmail] = useState<Email | null>(null);
  const [senderFilter, setSenderFilter] = useState('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingFunnel, setEditingFunnel] = useState<EmailFunnel | null>(null);
  const [newFunnelName, setNewFunnelName] = useState('');
  const [newFunnelDescription, setNewFunnelDescription] = useState('');
  const [newFunnelColor, setNewFunnelColor] = useState('#3b82f6');
  const [newFunnelEmailIds, setNewFunnelEmailIds] = useState<string[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  // Fetch funnels
  const { data: funnels, isLoading } = useQuery({
    queryKey: ['email-funnels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('email_funnels')
        .select('*')
        .order('last_email_at', { ascending: false });
      
      if (error) throw error;
      return data as EmailFunnel[];
    },
  });

  // Fetch unique senders for filter
  const { data: senders } = useQuery({
    queryKey: ['funnel-senders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('captured_newsletters')
        .select('from_email, from_name')
        .order('from_email');
      
      if (error) throw error;
      
      const unique = new Map<string, string>();
      (data || []).forEach(d => {
        if (!unique.has(d.from_email)) {
          unique.set(d.from_email, d.from_name || d.from_email);
        }
      });
      
      return Array.from(unique.entries()).map(([email, name]) => ({ email, name }));
    },
  });

  // Fetch emails for selected funnel
  const { data: funnelEmails } = useQuery({
    queryKey: ['funnel-emails', selectedFunnel?.id],
    queryFn: async () => {
      if (!selectedFunnel || !selectedFunnel.email_ids.length) return [];
      
      const { data, error } = await supabase
        .from('captured_newsletters')
        .select('*')
        .in('id', selectedFunnel.email_ids)
        .order('received_at', { ascending: true });
      
      if (error) throw error;
      return data as CapturedNewsletter[];
    },
    enabled: !!selectedFunnel?.email_ids?.length,
  });

  // Create funnel mutation
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user || !newFunnelName.trim() || newFunnelEmailIds.length === 0) {
        throw new Error('Preencha o nome e selecione pelo menos um email');
      }

      // Get email details for the selected emails
      const { data: emails, error: emailsError } = await supabase
        .from('captured_newsletters')
        .select('id, from_email, from_name, received_at')
        .in('id', newFunnelEmailIds)
        .order('received_at', { ascending: true });
      
      if (emailsError) throw emailsError;
      if (!emails || emails.length === 0) throw new Error('Emails não encontrados');

      // Reorder emails based on user selection
      const orderedEmails = newFunnelEmailIds
        .map(id => emails.find(e => e.id === id))
        .filter((e): e is typeof emails[0] => e !== undefined);

      const firstEmail = orderedEmails[0];
      const lastEmail = orderedEmails[orderedEmails.length - 1];

      // Calculate average interval based on user order
      let avgInterval = null;
      if (orderedEmails.length > 1) {
        let totalHours = 0;
        for (let i = 1; i < orderedEmails.length; i++) {
          totalHours += Math.abs(differenceInHours(
            new Date(orderedEmails[i].received_at),
            new Date(orderedEmails[i - 1].received_at)
          ));
        }
        avgInterval = Math.round(totalHours / (orderedEmails.length - 1));
      }

      // Get sender info from first email
      const senderEmail = firstEmail.from_email;
      const senderName = firstEmail.from_name;

      const { error } = await supabase
        .from('email_funnels')
        .insert({
          user_id: user.id,
          name: newFunnelName.trim(),
          description: newFunnelDescription.trim() || null,
          sender_email: senderEmail,
          sender_name: senderName,
          email_ids: newFunnelEmailIds,
          color: newFunnelColor,
          total_emails: newFunnelEmailIds.length,
          first_email_at: firstEmail.received_at,
          last_email_at: lastEmail.received_at,
          avg_interval_hours: avgInterval,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-builder-emails'] });
      setIsCreateOpen(false);
      resetCreateForm();
      toast.success('Funil criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const resetCreateForm = () => {
    setNewFunnelName('');
    setNewFunnelDescription('');
    setNewFunnelColor('#3b82f6');
    setNewFunnelEmailIds([]);
    setEditingFunnel(null);
  };

  // Open edit dialog for a funnel
  const openEditDialog = (funnel: EmailFunnel) => {
    setEditingFunnel(funnel);
    setNewFunnelName(funnel.name);
    setNewFunnelDescription(funnel.description || '');
    setNewFunnelColor(funnel.color);
    setNewFunnelEmailIds(funnel.email_ids || []);
    setIsEditOpen(true);
    setSelectedFunnel(null);
  };

  // Update funnel mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!user || !editingFunnel || !newFunnelName.trim() || newFunnelEmailIds.length === 0) {
        throw new Error('Preencha o nome e selecione pelo menos um email');
      }

      // Get email details for the selected emails
      const { data: emails, error: emailsError } = await supabase
        .from('captured_newsletters')
        .select('id, from_email, from_name, received_at')
        .in('id', newFunnelEmailIds)
        .order('received_at', { ascending: true });
      
      if (emailsError) throw emailsError;
      if (!emails || emails.length === 0) throw new Error('Emails não encontrados');

      // Reorder emails based on user selection
      const orderedEmails = newFunnelEmailIds
        .map(id => emails.find(e => e.id === id))
        .filter((e): e is typeof emails[0] => e !== undefined);

      const firstEmail = orderedEmails[0];
      const lastEmail = orderedEmails[orderedEmails.length - 1];

      // Calculate average interval based on user order
      let avgInterval = null;
      if (orderedEmails.length > 1) {
        let totalHours = 0;
        for (let i = 1; i < orderedEmails.length; i++) {
          totalHours += Math.abs(differenceInHours(
            new Date(orderedEmails[i].received_at),
            new Date(orderedEmails[i - 1].received_at)
          ));
        }
        avgInterval = Math.round(totalHours / (orderedEmails.length - 1));
      }

      // Get sender info from first email
      const senderEmail = firstEmail.from_email;
      const senderName = firstEmail.from_name;

      const { error } = await supabase
        .from('email_funnels')
        .update({
          name: newFunnelName.trim(),
          description: newFunnelDescription.trim() || null,
          sender_email: senderEmail,
          sender_name: senderName,
          email_ids: newFunnelEmailIds,
          color: newFunnelColor,
          total_emails: newFunnelEmailIds.length,
          first_email_at: firstEmail.received_at,
          last_email_at: lastEmail.received_at,
          avg_interval_hours: avgInterval,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingFunnel.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-funnels'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-builder-emails'] });
      queryClient.invalidateQueries({ queryKey: ['funnel-emails'] });
      setIsEditOpen(false);
      resetCreateForm();
      toast.success('Funil atualizado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Delete funnel mutation
  const deleteMutation = useMutation({
    mutationFn: async (funnelId: string) => {
      const { error } = await supabase
        .from('email_funnels')
        .delete()
        .eq('id', funnelId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-funnels'] });
      setIsEditOpen(false);
      resetCreateForm();
      toast.success('Funil excluído com sucesso!');
    },
    onError: () => {
      toast.error('Erro ao excluir funil');
    },
  });

  // Auto-detect funnels
  const detectFunnels = async () => {
    setIsDetecting(true);
    try {
      const { error } = await supabase.functions.invoke('detect-funnels', {
        body: { userId: user?.id }
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['email-funnels'] });
      toast.success('Funis detectados automaticamente!');
    } catch (error) {
      console.error('Error detecting funnels:', error);
      toast.error('Erro ao detectar funis');
    } finally {
      setIsDetecting(false);
    }
  };

  // Filter funnels
  const filteredFunnels = useMemo(() => {
    if (!funnels) return [];
    if (senderFilter === 'all') return funnels;
    return funnels.filter(f => f.sender_email === senderFilter);
  }, [funnels, senderFilter]);

  // Metrics
  const metrics = useMemo(() => {
    if (!funnels?.length) return { total: 0, totalEmails: 0, avgInterval: 0, longestFunnel: 0 };
    
    const totalEmails = funnels.reduce((sum, f) => sum + f.total_emails, 0);
    const avgInterval = Math.round(
      funnels.reduce((sum, f) => sum + (f.avg_interval_hours || 0), 0) / funnels.length
    );
    const longestFunnel = Math.max(...funnels.map(f => f.total_emails));

    return { total: funnels.length, totalEmails, avgInterval, longestFunnel };
  }, [funnels]);

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
    textBody: '',
    htmlContent: newsletter.html_content || '',
    category: (newsletter.category || 'onboarding') as Email['category'],
    topics: [],
    ctas: Array.isArray(newsletter.ctas) ? newsletter.ctas : [],
    links: [],
    isAbVariant: false,
  });

  const handleExport = () => {
    if (!filteredFunnels.length) {
      toast.error('Nenhum funil para exportar');
      return;
    }

    const csv = 'Nome,Remetente,Total Emails,Intervalo Médio (h),Primeiro Email,Último Email\n' +
      filteredFunnels.map(f => 
        `"${f.name}","${f.sender_email}",${f.total_emails},${f.avg_interval_hours || 0},"${f.first_email_at || ''}","${f.last_email_at || ''}"`
      ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `funis-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    toast.success('Exportação concluída');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <GitBranch className="h-8 w-8" />
            Funis de E-mails
          </h1>
          <p className="text-muted-foreground mt-1">
            Visualize sequências de emails em linhas do tempo visuais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={detectFunnels} disabled={isDetecting}>
            <Sparkles className={cn("h-4 w-4 mr-2", isDetecting && "animate-pulse")} />
            {isDetecting ? 'Detectando...' : 'Auto-detectar'}
          </Button>
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open);
            if (!open) resetCreateForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Funil
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle>Criar Novo Funil</DialogTitle>
                <DialogDescription>
                  Selecione e organize emails para criar uma sequência visual
                </DialogDescription>
              </DialogHeader>
              
              <div className="flex-1 overflow-y-auto">
                <div className="space-y-6 py-4">
                  {/* Funnel Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nome do Funil *</Label>
                      <Input
                        placeholder="Ex: Onboarding da Empresa X"
                        value={newFunnelName}
                        onChange={(e) => setNewFunnelName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cor do Funil</Label>
                      <div className="flex gap-2">
                        {colorOptions.map(c => (
                          <button
                            key={c.value}
                            type="button"
                            className={cn(
                              "w-8 h-8 rounded-full border-2 transition-all",
                              newFunnelColor === c.value ? "border-foreground scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: c.value }}
                            onClick={() => setNewFunnelColor(c.value)}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Descrição (opcional)</Label>
                    <Textarea
                      placeholder="Descreva o objetivo ou características deste funil..."
                      value={newFunnelDescription}
                      onChange={(e) => setNewFunnelDescription(e.target.value)}
                      rows={2}
                    />
                  </div>

                  {/* Funnel Builder */}
                  <div className="border-t pt-4">
                    <FunnelBuilder
                      selectedEmailIds={newFunnelEmailIds}
                      onEmailsChange={setNewFunnelEmailIds}
                      funnelColor={newFunnelColor}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t pt-4">
                <div className="flex items-center gap-4 w-full justify-between">
                  <div className="text-sm text-muted-foreground">
                    {newFunnelEmailIds.length > 0 && (
                      <span>{newFunnelEmailIds.length} email(s) selecionado(s)</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={() => createMutation.mutate()}
                      disabled={createMutation.isPending || !newFunnelName.trim() || newFunnelEmailIds.length === 0}
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      Criar Funil
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-sm font-medium mb-2 block">Remetente</Label>
              <Select value={senderFilter} onValueChange={setSenderFilter}>
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os remetentes</SelectItem>
                  {senders?.map(s => (
                    <SelectItem key={s.email} value={s.email}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funis</CardTitle>
            <GitBranch className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de E-mails</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalEmails}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intervalo Médio</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.avgInterval}h</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maior Funil</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.longestFunnel}</div>
            <p className="text-xs text-muted-foreground">e-mails</p>
          </CardContent>
        </Card>
      </div>

      {/* Funnels Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : !filteredFunnels?.length ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum funil criado</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crie funis para visualizar sequências de emails em linhas do tempo
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={detectFunnels}>
                <Sparkles className="h-4 w-4 mr-2" />
                Auto-detectar
              </Button>
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredFunnels.map((funnel) => (
            <Card 
              key={funnel.id} 
              className="cursor-pointer hover:shadow-lg transition-all group"
              style={{ borderLeftColor: funnel.color, borderLeftWidth: 4 }}
              onClick={() => setSelectedFunnel(funnel)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{funnel.name}</CardTitle>
                    <CardDescription>{funnel.sender_name || funnel.sender_email}</CardDescription>
                  </div>
                  <Badge variant="secondary">{funnel.total_emails} emails</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                  {funnel.avg_interval_hours && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {funnel.avg_interval_hours}h intervalo
                    </span>
                  )}
                  {funnel.first_email_at && funnel.last_email_at && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {differenceInDays(new Date(funnel.last_email_at), new Date(funnel.first_email_at))} dias
                    </span>
                  )}
                </div>
                {funnel.tags && funnel.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {funnel.tags.slice(0, 3).map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        <Tag className="h-2 w-2 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="sm" className="mt-2 w-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Eye className="h-4 w-4 mr-2" />
                  Ver Timeline
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Funnel Detail Sheet */}
      <Sheet open={!!selectedFunnel} onOpenChange={() => setSelectedFunnel(null)}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto">
          {selectedFunnel && (
            <>
              <SheetHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: selectedFunnel.color }}
                    />
                    <SheetTitle>{selectedFunnel.name}</SheetTitle>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => openEditDialog(selectedFunnel)}
                  >
                    <Pencil className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                </div>
                <SheetDescription>
                  {selectedFunnel.sender_name || selectedFunnel.sender_email} • {selectedFunnel.total_emails} e-mails
                </SheetDescription>
              </SheetHeader>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mt-6 mb-6">
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Duração Total</p>
                    <p className="text-lg font-bold">
                      {selectedFunnel.first_email_at && selectedFunnel.last_email_at
                        ? `${differenceInDays(new Date(selectedFunnel.last_email_at), new Date(selectedFunnel.first_email_at))} dias`
                        : '-'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Intervalo Médio</p>
                    <p className="text-lg font-bold">
                      {selectedFunnel.avg_interval_hours ? `${selectedFunnel.avg_interval_hours}h` : '-'}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/50">
                  <CardContent className="pt-4">
                    <p className="text-xs text-muted-foreground">Total E-mails</p>
                    <p className="text-lg font-bold">{selectedFunnel.total_emails}</p>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <div className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Linha do Tempo
                </h4>
                
                {!funnelEmails?.length ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {funnelEmails.map((email, index) => {
                      const prevEmail = funnelEmails[index - 1];
                      const dayOffset = prevEmail
                        ? differenceInDays(new Date(email.received_at), new Date(funnelEmails[0].received_at))
                        : 0;

                      return (
                        <div
                          key={email.id}
                          className={cn(
                            "relative group border-2 rounded-lg overflow-hidden transition-all hover:scale-105 hover:shadow-lg cursor-pointer",
                            categoryColors[email.category || ''] || 'border-border'
                          )}
                          onClick={() => setViewingEmail(convertToEmail(email))}
                        >
                          <div className="aspect-[3/4] relative bg-white">
                            <EmailThumbnail
                              htmlContent={email.html_content}
                              subject={email.subject}
                              onClick={() => setViewingEmail(convertToEmail(email))}
                            />
                          </div>
                          
                          <div className="p-3 space-y-2 bg-card">
                            <div className="flex items-center justify-between gap-2">
                              <Badge 
                                variant="secondary" 
                                className="text-xs font-bold"
                                style={{ backgroundColor: `${selectedFunnel.color}20`, color: selectedFunnel.color }}
                              >
                                D+{dayOffset}
                              </Badge>
                              {email.category && (
                                <Badge variant="outline" className="text-xs">
                                  {email.category}
                                </Badge>
                              )}
                            </div>
                            
                            <h4 className="text-sm font-medium line-clamp-2 leading-tight">
                              {email.subject}
                            </h4>
                            
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(email.received_at), "dd MMM HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Detailed Timeline List */}
                {funnelEmails && funnelEmails.length > 0 && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-4">Detalhes da Sequência</h4>
                    <div className="space-y-3">
                      {funnelEmails.map((email, index) => {
                        const prevEmail = funnelEmails[index - 1];
                        const hoursSincePrev = prevEmail
                          ? differenceInHours(new Date(email.received_at), new Date(prevEmail.received_at))
                          : 0;

                        return (
                          <div 
                            key={email.id}
                            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => setViewingEmail(convertToEmail(email))}
                          >
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                              style={{ backgroundColor: selectedFunnel.color }}
                            >
                              {index + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">{email.subject}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(email.received_at), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                              </p>
                            </div>
                            {index > 0 && (
                              <Badge variant="outline" className="flex-shrink-0">
                                +{hoursSincePrev}h
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <EmailViewer 
        email={viewingEmail}
        open={!!viewingEmail}
        onOpenChange={(open) => !open && setViewingEmail(null)}
      />

      {/* Edit Funnel Dialog */}
      <Dialog open={isEditOpen} onOpenChange={(open) => {
        setIsEditOpen(open);
        if (!open) resetCreateForm();
      }}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Editar Funil</DialogTitle>
            <DialogDescription>
              Modifique as informações e reorganize os emails do funil
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-6 py-4">
              {/* Funnel Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Funil *</Label>
                  <Input
                    placeholder="Ex: Onboarding da Empresa X"
                    value={newFunnelName}
                    onChange={(e) => setNewFunnelName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor do Funil</Label>
                  <div className="flex gap-2">
                    {colorOptions.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newFunnelColor === c.value ? "border-foreground scale-110" : "border-transparent"
                        )}
                        style={{ backgroundColor: c.value }}
                        onClick={() => setNewFunnelColor(c.value)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  placeholder="Descreva o objetivo ou características deste funil..."
                  value={newFunnelDescription}
                  onChange={(e) => setNewFunnelDescription(e.target.value)}
                  rows={2}
                />
              </div>

              {/* Funnel Builder */}
              <div className="border-t pt-4">
                <FunnelBuilder
                  selectedEmailIds={newFunnelEmailIds}
                  onEmailsChange={setNewFunnelEmailIds}
                  funnelColor={newFunnelColor}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <div className="flex items-center gap-4 w-full justify-between">
              <div className="flex items-center gap-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => {
                    if (editingFunnel && confirm('Tem certeza que deseja excluir este funil?')) {
                      deleteMutation.mutate(editingFunnel.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Excluir
                </Button>
                <span className="text-sm text-muted-foreground">
                  {newFunnelEmailIds.length > 0 && (
                    <span>{newFunnelEmailIds.length} email(s) selecionado(s)</span>
                  )}
                </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending || !newFunnelName.trim() || newFunnelEmailIds.length === 0}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Salvar Alterações
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Funnels;
