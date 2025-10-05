import { useEffect, useState } from 'react';
import { GitBranch, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { funnelService } from '@/services/api';
import type { Funnel } from '@/types';
import { useNavigate } from 'react-router-dom';

const Funnels = () => {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const loadFunnels = async () => {
      try {
        const data = await funnelService.list();
        setFunnels(data);
      } finally {
        setLoading(false);
      }
    };
    loadFunnels();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Funis</h1>
        <p className="text-muted-foreground mt-1">
          Sequências de e-mails detectadas automaticamente
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : funnels.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">
            Nenhum funil detectado ainda
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead className="text-right">Nº de E-mails</TableHead>
                <TableHead className="text-right">Gap Médio (h)</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funnels.map((funnel) => (
                <TableRow key={funnel.id}>
                  <TableCell className="font-medium">{funnel.name}</TableCell>
                  <TableCell>{formatDate(funnel.startDate)}</TableCell>
                  <TableCell>
                    {funnel.endDate ? formatDate(funnel.endDate) : 'Em andamento'}
                  </TableCell>
                  <TableCell className="text-right">{funnel.emailIds.length}</TableCell>
                  <TableCell className="text-right">
                    {funnel.cadenceSummary.avgGap}h
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/funnels/${funnel.id}`)}
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

export default Funnels;
