import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Newsletter {
  id: string;
  from_email: string;
  from_name: string | null;
  subject: string;
  received_at: string;
  category: string | null;
  email_seeds?: {
    name: string;
    email: string;
  };
}

interface ExportNewslettersButtonProps {
  newsletters: Newsletter[] | undefined;
  isLoading?: boolean;
}

const categoryLabels: Record<string, string> = {
  onboarding: 'Onboarding',
  promo: 'Promocional',
  educacao: 'Educacional',
  reengajamento: 'Reengajamento',
  sazonal: 'Sazonal',
  newsletter: 'Newsletter',
  transacional: 'Transacional',
  outros: 'Outros',
};

export function ExportNewslettersButton({ newsletters, isLoading }: ExportNewslettersButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const prepareData = () => {
    if (!newsletters) return [];

    return newsletters.map((item) => ({
      'Assunto': item.subject,
      'Remetente': item.from_name || item.from_email,
      'E-mail Remetente': item.from_email,
      'Categoria': item.category ? (categoryLabels[item.category] || item.category) : 'Não classificado',
      'Recebido em': format(new Date(item.received_at), "dd/MM/yyyy HH:mm", { locale: ptBR }),
      'E-mail Seed': item.email_seeds?.name || 'N/A',
    }));
  };

  const exportToCSV = () => {
    setIsExporting(true);
    try {
      const data = prepareData();
      const ws = XLSX.utils.json_to_sheet(data);
      const csv = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
      
      const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `newsletters_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const data = prepareData();
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Newsletters');
      
      // Auto-size columns
      const colWidths = Object.keys(data[0] || {}).map((key) => ({
        wch: Math.max(key.length, ...data.map((row: any) => String(row[key] || '').length)) + 2
      }));
      ws['!cols'] = colWidths;

      XLSX.writeFile(wb, `newsletters_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`);
    } finally {
      setIsExporting(false);
    }
  };

  const hasData = newsletters && newsletters.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={!hasData || isLoading || isExporting}
          className="gap-2"
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          Exportar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToCSV} className="gap-2 cursor-pointer">
          <FileText className="h-4 w-4" />
          Exportar CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToExcel} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="h-4 w-4" />
          Exportar Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
