import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Globe, 
  Building2, 
  Mail, 
  Link2, 
  Tags, 
  Loader2,
  Info,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';

const senderFormSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres').max(100, 'Nome muito longo'),
  website: z.string().url('URL inválida').max(255, 'URL muito longa'),
  mainDomain: z.string().min(3, 'Domínio deve ter pelo menos 3 caracteres').max(100, 'Domínio muito longo'),
  industry: z.string().min(1, 'Selecione um setor'),
  captureUrl: z.string().url('URL de captura inválida').optional().or(z.literal('')),
  seedEmail: z.string().email('E-mail inválido').optional().or(z.literal('')),
  labels: z.string().optional(),
  notes: z.string().max(500, 'Notas muito longas').optional(),
  monitoringFrequency: z.string().default('daily'),
  priority: z.string().default('medium'),
});

type SenderFormData = z.infer<typeof senderFormSchema>;

interface NewSenderFormProps {
  onSubmit?: (data: SenderFormData) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const industries = [
  { value: 'ecommerce', label: 'E-commerce' },
  { value: 'saas', label: 'SaaS / Software' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'education', label: 'Educação' },
  { value: 'health', label: 'Saúde' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'travel', label: 'Viagens' },
  { value: 'food', label: 'Alimentação' },
  { value: 'retail', label: 'Varejo' },
  { value: 'media', label: 'Mídia / Entretenimento' },
  { value: 'other', label: 'Outro' },
];

const priorities = [
  { value: 'high', label: 'Alta', color: 'bg-red-500/10 text-red-700 border-red-500/20' },
  { value: 'medium', label: 'Média', color: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20' },
  { value: 'low', label: 'Baixa', color: 'bg-green-500/10 text-green-700 border-green-500/20' },
];

const frequencies = [
  { value: 'realtime', label: 'Tempo real' },
  { value: 'hourly', label: 'A cada hora' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
];

export function NewSenderForm({ onSubmit, onCancel, isLoading = false }: NewSenderFormProps) {
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState('');

  const form = useForm<SenderFormData>({
    resolver: zodResolver(senderFormSchema),
    defaultValues: {
      name: '',
      website: '',
      mainDomain: '',
      industry: '',
      captureUrl: '',
      seedEmail: '',
      labels: '',
      notes: '',
      monitoringFrequency: 'daily',
      priority: 'medium',
    },
  });

  const handleAddLabel = () => {
    if (labelInput.trim() && !labels.includes(labelInput.trim())) {
      const newLabels = [...labels, labelInput.trim()];
      setLabels(newLabels);
      form.setValue('labels', newLabels.join(','));
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    const newLabels = labels.filter(l => l !== label);
    setLabels(newLabels);
    form.setValue('labels', newLabels.join(','));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddLabel();
    }
  };

  const extractDomain = (url: string) => {
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      form.setValue('mainDomain', domain);
    } catch {
      // URL inválida, não faz nada
    }
  };

  const handleFormSubmit = (data: SenderFormData) => {
    if (onSubmit) {
      onSubmit(data);
    } else {
      toast({
        title: 'Remetente criado!',
        description: `${data.name} foi adicionado com sucesso.`,
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Informações Básicas
            </CardTitle>
            <CardDescription>
              Dados principais do remetente a ser monitorado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Remetente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Empresa XYZ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Setor *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o setor" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {industries.map((industry) => (
                          <SelectItem key={industry.value} value={industry.value}>
                            {industry.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="https://exemplo.com.br" 
                        className="pl-9"
                        {...field}
                        onBlur={(e) => {
                          field.onBlur();
                          extractDomain(e.target.value);
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    O domínio principal será extraído automaticamente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainDomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Domínio Principal *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="exemplo.com.br" 
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Configurações de Monitoramento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Configurações de Monitoramento
            </CardTitle>
            <CardDescription>
              Configure como o concorrente será monitorado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="captureUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL de Captura (Landing Page)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        placeholder="https://exemplo.com.br/newsletter" 
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    Página onde o e-mail seed será inscrito
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="seedEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>E-mail Seed</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input 
                        type="email"
                        placeholder="seed@seudominio.com" 
                        className="pl-9"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    E-mail que receberá as campanhas do concorrente
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="monitoringFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequência de Verificação</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {frequencies.map((freq) => (
                          <SelectItem key={freq.value} value={freq.value}>
                            {freq.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridade</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorities.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={priority.color}>
                                {priority.label}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tags e Notas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5 text-primary" />
              Organização
            </CardTitle>
            <CardDescription>
              Adicione etiquetas e notas para organizar seus concorrentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Etiquetas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma etiqueta e pressione Enter"
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <Button type="button" variant="outline" onClick={handleAddLabel}>
                  Adicionar
                </Button>
              </div>
              {labels.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {labels.map((label) => (
                    <Badge
                      key={label}
                      variant="secondary"
                      className="cursor-pointer hover:bg-destructive/10 hover:text-destructive transition-colors"
                      onClick={() => handleRemoveLabel(label)}
                    >
                      {label} ×
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notas</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Observações sobre o concorrente, estratégias identificadas, etc..."
                      className="min-h-24 resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Máximo de 500 caracteres
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Dica */}
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                  Dica: Configuração automática
                </p>
                <p className="text-muted-foreground">
                  Após cadastrar, nossa IA irá automaticamente detectar e categorizar 
                  os e-mails recebidos, identificando padrões de funil e testes A/B.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Ações */}
        <div className="flex justify-end gap-3">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
          )}
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Cadastrar Remetente
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
