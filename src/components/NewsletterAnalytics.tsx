import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Mail, TrendingUp, Clock, Link2, FileText, Users } from 'lucide-react';

const COLORS = ['hsl(228, 100%, 65%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)', 'hsl(0, 84%, 60%)', 'hsl(280, 100%, 65%)'];

export function NewsletterAnalytics() {
  const { user } = useAuth();

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['newsletter-analytics', user?.id],
    queryFn: async () => {
      // Fetch seeds first
      const { data: seeds } = await supabase
        .from('email_seeds')
        .select('id')
        .eq('user_id', user?.id);

      const seedIds = seeds?.map(s => s.id) || [];

      if (seedIds.length === 0) {
        return null;
      }

      // Fetch newsletters
      const { data: newsletters } = await supabase
        .from('captured_newsletters')
        .select('*')
        .in('seed_id', seedIds)
        .order('received_at', { ascending: false });

      if (!newsletters || newsletters.length === 0) {
        return null;
      }

      // Calculate statistics
      const senderCounts: Record<string, number> = {};
      const categoryCounts: Record<string, number> = {};
      const typeCounts: Record<string, number> = {};
      const hourCounts: Record<string, number> = {};
      const dayCounts: Record<string, number> = {};
      const weeklyData: Record<string, number> = {};
      
      let totalLinks = 0;
      let totalWords = 0;
      let withImages = 0;

      newsletters.forEach((nl: any) => {
        // Sender counts
        const sender = nl.from_name || nl.from_email || 'Desconhecido';
        senderCounts[sender] = (senderCounts[sender] || 0) + 1;

        // Category counts
        if (nl.category) {
          categoryCounts[nl.category] = (categoryCounts[nl.category] || 0) + 1;
        }

        // Type counts
        if (nl.email_type) {
          typeCounts[nl.email_type] = (typeCounts[nl.email_type] || 0) + 1;
        }

        // Hour distribution
        if (nl.received_at) {
          const date = new Date(nl.received_at);
          const hour = date.getHours().toString().padStart(2, '0') + 'h';
          hourCounts[hour] = (hourCounts[hour] || 0) + 1;

          const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });
          dayCounts[dayName] = (dayCounts[dayName] || 0) + 1;

          // Weekly trend
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.toISOString().split('T')[0];
          weeklyData[weekKey] = (weeklyData[weekKey] || 0) + 1;
        }

        // Content stats
        totalLinks += nl.links_count || 0;
        totalWords += nl.word_count || 0;
        if (nl.has_images) withImages++;
      });

      // Format data for charts
      const topSenders = Object.entries(senderCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value }));

      const categoryData = Object.entries(categoryCounts)
        .map(([name, value]) => ({ name, value }));

      const typeData = Object.entries(typeCounts)
        .map(([name, value]) => ({ name, value }));

      const hourData = Object.entries(hourCounts)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([name, value]) => ({ name, value }));

      const weeklyTrend = Object.entries(weeklyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-8)
        .map(([date, value]) => ({ 
          name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          value 
        }));

      return {
        totalEmails: newsletters.length,
        avgLinksPerEmail: Math.round(totalLinks / newsletters.length),
        avgWordsPerEmail: Math.round(totalWords / newsletters.length),
        emailsWithImages: Math.round((withImages / newsletters.length) * 100),
        uniqueSenders: Object.keys(senderCounts).length,
        topSenders,
        categoryData,
        typeData,
        hourData,
        weeklyTrend,
      };
    },
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum dado disponível para análise</p>
        <p className="text-sm">Capture alguns emails primeiro</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Total Emails</span>
            </div>
            <p className="text-2xl font-bold">{analytics.totalEmails}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Remetentes</span>
            </div>
            <p className="text-2xl font-bold">{analytics.uniqueSenders}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Média Links</span>
            </div>
            <p className="text-2xl font-bold">{analytics.avgLinksPerEmail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Média Palavras</span>
            </div>
            <p className="text-2xl font-bold">{analytics.avgWordsPerEmail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Com Imagens</span>
            </div>
            <p className="text-2xl font-bold">{analytics.emailsWithImages}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Por Dia</span>
            </div>
            <p className="text-2xl font-bold">{(analytics.totalEmails / 30).toFixed(1)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Remetentes</CardTitle>
            <CardDescription>Quem mais envia emails</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={analytics.topSenders} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(228, 100%, 65%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendência Semanal</CardTitle>
            <CardDescription>Emails recebidos por semana</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={analytics.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="hsl(228, 100%, 65%)" 
                  strokeWidth={2}
                  dot={{ fill: 'hsl(228, 100%, 65%)' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Por Categoria</CardTitle>
            <CardDescription>Distribuição por tipo de conteúdo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {analytics.categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por Tipo de Email</CardTitle>
            <CardDescription>Marketing, institucional, etc.</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={analytics.typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name }) => name}
                >
                  {analytics.typeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Horário de Envio</CardTitle>
            <CardDescription>Quando os emails chegam</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={analytics.hourData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={10} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
