import { useEffect, useState } from 'react';
import { Search, LayoutGrid, List } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmailCard } from '@/components/EmailCard';
import { EmailThumbnail } from '@/components/EmailThumbnail';
import { EmailCategoryBadge } from '@/components/EmailCategoryBadge';
import { EmailViewer } from '@/components/EmailViewer';
import { emailService } from '@/services/api';
import type { Email } from '@/types';

const Library = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    const loadEmails = async () => {
      try {
        const response = await emailService.search({ search });
        setEmails(response.data);
      } finally {
        setLoading(false);
      }
    };
    const timer = setTimeout(() => {
      loadEmails();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Biblioteca</h1>
          <p className="text-muted-foreground mt-1">
            Busque e explore todos os e-mails coletados
          </p>
        </div>
        
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por assunto, tópicos, CTAs..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      ) : emails.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <p className="text-muted-foreground">
            {search ? 'Nenhum e-mail encontrado' : 'Nenhum e-mail na biblioteca ainda'}
          </p>
        </div>
      ) : viewMode === 'list' ? (
        <div className="space-y-4">
          {emails.map((email) => (
            <EmailCard 
              key={email.id} 
              email={email} 
              onView={() => setSelectedEmail(email)}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {emails.map((email) => (
            <div key={email.id} className="space-y-2">
              <div className="aspect-[3/4] rounded-lg overflow-hidden border hover:border-primary transition-colors">
                <EmailThumbnail
                  htmlContent={email.htmlContent}
                  subject={email.subject}
                  onClick={() => setSelectedEmail(email)}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <EmailCategoryBadge category={email.category} />
                  {email.isAbVariant && (
                    <Badge variant="outline" className="text-xs">A/B</Badge>
                  )}
                </div>
                <h4 className="text-sm font-medium line-clamp-2 leading-tight">{email.subject}</h4>
                <p className="text-xs text-muted-foreground truncate">{email.from}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <EmailViewer 
        email={selectedEmail}
        open={!!selectedEmail}
        onOpenChange={(open) => !open && setSelectedEmail(null)}
      />
    </div>
  );
};

export default Library;
