import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { Code, Download, Copy, FileCode } from 'lucide-react';

interface ExportHTMLButtonProps {
  htmlContent?: string | null;
  subject: string;
}

export function ExportHTMLButton({ htmlContent, subject }: ExportHTMLButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  const sanitizeFilename = (name: string) => {
    return name.replace(/[^a-z0-9]/gi, '_').substring(0, 50);
  };

  const downloadHTML = () => {
    if (!htmlContent) {
      toast.error('Conteúdo HTML não disponível');
      return;
    }

    setIsExporting(true);
    try {
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${sanitizeFilename(subject)}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('HTML baixado!');
    } catch (error) {
      toast.error('Erro ao baixar HTML');
    } finally {
      setIsExporting(false);
    }
  };

  const copyHTML = () => {
    if (!htmlContent) {
      toast.error('Conteúdo HTML não disponível');
      return;
    }

    navigator.clipboard.writeText(htmlContent);
    toast.success('HTML copiado para a área de transferência!');
  };

  const openInNewTab = () => {
    if (!htmlContent) {
      toast.error('Conteúdo HTML não disponível');
      return;
    }

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  if (!htmlContent) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          <Code className="w-4 h-4 mr-2" />
          Exportar HTML
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onClick={downloadHTML}>
          <Download className="w-4 h-4 mr-2" />
          Baixar arquivo .html
        </DropdownMenuItem>
        <DropdownMenuItem onClick={copyHTML}>
          <Copy className="w-4 h-4 mr-2" />
          Copiar código HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={openInNewTab}>
          <FileCode className="w-4 h-4 mr-2" />
          Abrir em nova aba
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
