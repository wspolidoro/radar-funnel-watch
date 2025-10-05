import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { EmailCard } from '@/components/EmailCard';
import { emailService } from '@/services/api';
import type { Email } from '@/types';

const Library = () => {
  const [emails, setEmails] = useState<Email[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

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
      <div>
        <h1 className="text-3xl font-bold">Biblioteca</h1>
        <p className="text-muted-foreground mt-1">
          Busque e explore todos os e-mails coletados
        </p>
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {emails.map((email) => (
            <EmailCard key={email.id} email={email} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Library;
