import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;

    // Create client with user's token
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, conversationHistory = [] } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Use service role to fetch data
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch user's newsletter data for context
    const { data: seeds } = await supabase
      .from('email_seeds')
      .select('id, email, name')
      .eq('user_id', user.id);

    const seedIds = seeds?.map(s => s.id) || [];

    // Get newsletter statistics
    const { data: newsletters } = await supabase
      .from('captured_newsletters')
      .select('*')
      .in('seed_id', seedIds)
      .order('received_at', { ascending: false })
      .limit(100);

    // Calculate statistics
    const stats = {
      totalEmails: newsletters?.length || 0,
      senders: {} as Record<string, number>,
      categories: {} as Record<string, number>,
      emailTypes: {} as Record<string, number>,
      avgLinksPerEmail: 0,
      avgWordsPerEmail: 0,
      sendingHours: {} as Record<string, number>,
      sendingDays: {} as Record<string, number>,
    };

    if (newsletters && newsletters.length > 0) {
      let totalLinks = 0;
      let totalWords = 0;

      newsletters.forEach((nl: any) => {
        // Count by sender
        const sender = nl.from_name || nl.from_email;
        stats.senders[sender] = (stats.senders[sender] || 0) + 1;

        // Count by category
        if (nl.category) {
          stats.categories[nl.category] = (stats.categories[nl.category] || 0) + 1;
        }

        // Count by email type
        if (nl.email_type) {
          stats.emailTypes[nl.email_type] = (stats.emailTypes[nl.email_type] || 0) + 1;
        }

        // Count links and words
        totalLinks += nl.links_count || 0;
        totalWords += nl.word_count || 0;

        // Count sending hours and days
        if (nl.received_at) {
          const date = new Date(nl.received_at);
          const hour = date.getHours().toString();
          const day = date.toLocaleDateString('pt-BR', { weekday: 'long' });
          stats.sendingHours[hour] = (stats.sendingHours[hour] || 0) + 1;
          stats.sendingDays[day] = (stats.sendingDays[day] || 0) + 1;
        }
      });

      stats.avgLinksPerEmail = Math.round(totalLinks / newsletters.length);
      stats.avgWordsPerEmail = Math.round(totalWords / newsletters.length);
    }

    // Top senders
    const topSenders = Object.entries(stats.senders)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => `${name}: ${count} emails`);

    // Build context for AI
    const dataContext = `
Dados dos emails capturados do usuário:
- Total de emails: ${stats.totalEmails}
- Top remetentes: ${topSenders.join(', ')}
- Categorias: ${JSON.stringify(stats.categories)}
- Tipos de email: ${JSON.stringify(stats.emailTypes)}
- Média de links por email: ${stats.avgLinksPerEmail}
- Média de palavras por email: ${stats.avgWordsPerEmail}
- Horários mais comuns: ${JSON.stringify(stats.sendingHours)}
- Dias mais comuns: ${JSON.stringify(stats.sendingDays)}

Últimos 5 assuntos recebidos:
${newsletters?.slice(0, 5).map((nl: any) => `- ${nl.from_name || nl.from_email}: "${nl.subject}"`).join('\n') || 'Nenhum email ainda'}
`;

    // Build messages for AI
    const messages = [
      {
        role: 'system',
        content: `Você é um assistente especializado em análise de email marketing e estratégias de comunicação. 
Você tem acesso aos dados de newsletters capturados pelo usuário e deve fornecer insights acionáveis.

${dataContext}

Seja conciso mas informativo. Use dados específicos quando disponíveis. 
Formate suas respostas em markdown quando apropriado.
Responda sempre em português do Brasil.`
      },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
      })),
      {
        role: 'user',
        content: message,
      }
    ];

    // Call Lovable AI
    const response = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0]?.message?.content || 'Desculpe, não consegui processar sua pergunta.';

    // Save messages to database
    await supabase.from('chat_messages').insert([
      { user_id: user.id, role: 'user', content: message },
      { user_id: user.id, role: 'assistant', content: assistantMessage },
    ]);

    return new Response(JSON.stringify({ 
      message: assistantMessage,
      stats: {
        totalEmails: stats.totalEmails,
        topSender: topSenders[0] || 'Nenhum',
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in chat insights:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
