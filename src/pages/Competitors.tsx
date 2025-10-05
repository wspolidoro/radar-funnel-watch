import { useEffect, useState } from 'react';
import { Plus, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { competitorService } from '@/services/api';
import type { Competitor } from '@/types';
import { useNavigate } from 'react-router-dom';

const Competitors = () => {
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadCompetitors = async () => {
      try {
        const response = await competitorService.list();
        setCompetitors(response.data);
      } finally {
        setLoading(false);
      }
    };
    loadCompetitors();
  }, []);

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
      active: 'default',
      paused: 'secondary',
      error: 'destructive'
    };
    const labels: Record<string, string> = {
      active: 'Ativo',
      paused: 'Pausado',
      error: 'Erro'
    };
    return (
      <Badge variant={variants[status] || 'secondary'}>
        {labels[status] || status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Concorrentes</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie e monitore seus concorrentes
          </p>
        </div>
        <Button onClick={() => navigate('/onboarding')}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Concorrente
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : competitors.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground mb-4">
            Nenhum concorrente cadastrado ainda
          </p>
          <Button onClick={() => navigate('/onboarding')}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Concorrente
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Domínio</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">E-mails (30d)</TableHead>
                <TableHead className="text-right">Funis Ativos</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {competitors.map((comp) => (
                <TableRow key={comp.id}>
                  <TableCell className="font-medium">{comp.name}</TableCell>
                  <TableCell className="text-muted-foreground">{comp.mainDomain}</TableCell>
                  <TableCell>{getStatusBadge(comp.status)}</TableCell>
                  <TableCell className="text-right">{comp.emailsLast30d}</TableCell>
                  <TableCell className="text-right">{comp.activeFunnels}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/competitors/${comp.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Competitors;
