import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Plus, Download, Loader2, Calendar, Clock, Mail, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Report {
  id: string;
  title: string;
  description: string | null;
  period_start: string;
  period_end: string;
  format: string;
  status: string;
  is_scheduled: boolean;
  schedule_frequency: string | null;
  send_email: boolean;
  file_url: string | null;
  created_at: string;
  content_json: any;
}

const statusLabels: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  pending: { label: 'Pendente', variant: 'secondary' },
  processing: { label: 'Processando', variant: 'default' },
  completed: { label: 'Concluído', variant: 'default' },
  failed: { label: 'Falhou', variant: 'destructive' },
};

const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useQuery({
    queryKey: ['reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as Report[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reports')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] });
      toast.success('Relatório excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir relatório');
    },
  });

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd 'de' MMM 'de' yyyy", { locale: ptBR });
  };

  const handleDownload = (report: Report) => {
    if (report.file_url) {
      window.open(report.file_url, '_blank');
    } else if (report.content_json) {
      // Generate download from content_json
      const blob = new Blob([JSON.stringify(report.content_json, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${report.title.replace(/\s+/g, '_')}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Download iniciado');
    } else {
      toast.error('Relatório ainda não está pronto para download');
    }
  };

  const scheduledReports = reports?.filter(r => r.is_scheduled) || [];
  const regularReports = reports?.filter(r => !r.is_scheduled) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Relatórios
          </h1>
          <p className="text-muted-foreground mt-1">
            Relatórios gerados com insights de IA, download e agendamento automático
          </p>
        </div>
        <Button onClick={() => navigate('/reports/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Relatório
        </Button>
      </div>

      {/* Scheduled Reports */}
      {scheduledReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Relatórios Agendados
            </CardTitle>
            <CardDescription>
              Relatórios que são gerados automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {scheduledReports.map((report) => (
                <Card key={report.id} className="bg-muted/50">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium">{report.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          {report.schedule_frequency === 'weekly' ? 'Semanal' : 
                           report.schedule_frequency === 'monthly' ? 'Mensal' : 
                           report.schedule_frequency}
                        </p>
                      </div>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Ativo
                      </Badge>
                    </div>
                    {report.send_email && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        Enviado por email
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">
            Nenhum relatório gerado ainda
          </p>
          <Button onClick={() => navigate('/reports/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Gerar Primeiro Relatório
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Formato</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => {
                const status = statusLabels[report.status] || { label: report.status, variant: 'outline' as const };
                return (
                  <TableRow key={report.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{report.title}</span>
                        {report.description && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {report.description}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        {formatDate(report.period_start)} - {formatDate(report.period_end)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="uppercase">
                        {report.format}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(report.created_at)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDownload(report)}
                          disabled={report.status !== 'completed'}
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Baixar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteMutation.mutate(report.id)}
                                className="bg-destructive text-destructive-foreground"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Reports;
