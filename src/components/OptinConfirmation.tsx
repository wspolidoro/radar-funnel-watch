import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle, ExternalLink, Clock, AlertCircle, Check } from 'lucide-react';

interface OptinConfirmationProps {
  newsletterId: string;
  optinStatus: string | null;
  confirmationLink: string | null;
  onStatusChange?: () => void;
}

export function OptinConfirmation({
  newsletterId,
  optinStatus,
  confirmationLink,
  onStatusChange,
}: OptinConfirmationProps) {
  const queryClient = useQueryClient();

  const markConfirmedMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('captured_newsletters')
        .update({ optin_status: 'confirmed' })
        .eq('id', newsletterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      toast.success('Marcado como confirmado!');
      onStatusChange?.();
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar status', { description: error.message });
    },
  });

  const handleOpenConfirmation = () => {
    if (confirmationLink) {
      window.open(confirmationLink, '_blank');
      toast.info('Após confirmar, clique em "Marcar como Confirmado"');
    }
  };

  const getStatusBadge = () => {
    switch (optinStatus) {
      case 'confirmed':
        return (
          <Badge variant="default" className="bg-success">
            <CheckCircle className="w-3 h-3 mr-1" /> Confirmado
          </Badge>
        );
      case 'needs_confirmation':
        return (
          <Badge variant="secondary" className="bg-warning text-warning-foreground">
            <AlertCircle className="w-3 h-3 mr-1" /> Aguardando Opt-in
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="w-3 h-3 mr-1" /> Desconhecido
          </Badge>
        );
    }
  };

  if (optinStatus === 'confirmed') {
    return (
      <div className="flex items-center gap-2">
        {getStatusBadge()}
      </div>
    );
  }

  if (optinStatus === 'needs_confirmation') {
    return (
      <div className="flex flex-col gap-2">
        {getStatusBadge()}
        <div className="flex items-center gap-2">
          {confirmationLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenConfirmation}
            >
              <ExternalLink className="w-4 h-4 mr-1" />
              Abrir Link de Confirmação
            </Button>
          )}
          <Button
            variant="default"
            size="sm"
            onClick={() => markConfirmedMutation.mutate()}
            disabled={markConfirmedMutation.isPending}
          >
            <Check className="w-4 h-4 mr-1" />
            {markConfirmedMutation.isPending ? 'Salvando...' : 'Marcar como Confirmado'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {getStatusBadge()}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => markConfirmedMutation.mutate()}
        disabled={markConfirmedMutation.isPending}
      >
        <Check className="w-4 h-4 mr-1" />
        Marcar Confirmado
      </Button>
    </div>
  );
}
