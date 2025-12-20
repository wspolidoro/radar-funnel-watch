import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NewsletterAnalytics } from '@/components/NewsletterAnalytics';
import { AIChatPanel } from '@/components/AIChatPanel';
import { BarChart3, Bot } from 'lucide-react';

export default function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics & Insights</h1>
        <p className="text-muted-foreground">
          Análise detalhada dos emails capturados e insights de marketing com IA
        </p>
      </div>

      <Tabs defaultValue="analytics" className="space-y-4">
        <TabsList>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Chat com IA
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analytics">
          <NewsletterAnalytics />
        </TabsContent>

        <TabsContent value="ai">
          <div className="max-w-3xl">
            <AIChatPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
