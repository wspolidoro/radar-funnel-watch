import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CategorizeRequest {
  newsletterId?: string;
  batchProcess?: boolean;
}

const CATEGORIES = [
  'onboarding',
  'educacao', 
  'promo',
  'reengajamento',
  'sazonal',
  'transacional',
  'newsletter',
  'outros'
] as const;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { newsletterId, batchProcess }: CategorizeRequest = await req.json();

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get newsletters to categorize
    let query = supabaseClient
      .from('captured_newsletters')
      .select('id, subject, from_email, from_name, text_content, html_content')
      .is('category', null);

    if (newsletterId) {
      query = query.eq('id', newsletterId);
    } else if (batchProcess) {
      query = query.limit(10);
    } else {
      return new Response(
        JSON.stringify({ error: 'Newsletter ID or batch process flag required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: newsletters, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching newsletters:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch newsletters' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!newsletters || newsletters.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No newsletters to categorize', processed: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Categorizing ${newsletters.length} newsletters`);

    const results: { id: string; category: string }[] = [];

    for (const newsletter of newsletters) {
      try {
        // Extract text content for analysis
        let content = newsletter.text_content || '';
        if (!content && newsletter.html_content) {
          // Strip HTML tags for analysis
          content = newsletter.html_content
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 2000); // Limit content length
        }

        const prompt = `Analise este email de marketing e classifique-o em UMA das seguintes categorias:
- onboarding: emails de boas-vindas, configuração inicial, primeiros passos
- educacao: tutoriais, dicas, conteúdo educativo, blog posts
- promo: promoções, descontos, ofertas, vendas
- reengajamento: emails para reconquistar usuários inativos, "sentimos sua falta"
- sazonal: datas comemorativas, feriados, eventos sazonais
- transacional: confirmações, recibos, atualizações de pedido
- newsletter: digest semanal/mensal, curadoria de conteúdo, notícias
- outros: não se encaixa em nenhuma categoria acima

Email:
De: ${newsletter.from_name || newsletter.from_email}
Assunto: ${newsletter.subject}
Conteúdo: ${content.substring(0, 1500)}

Responda APENAS com o nome da categoria, nada mais.`;

        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { role: 'system', content: 'Você é um especialista em email marketing. Classifique emails em categorias precisas. Responda apenas com o nome da categoria.' },
              { role: 'user', content: prompt }
            ],
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            console.log('Rate limited, stopping batch');
            break;
          }
          console.error('AI API error:', response.status);
          continue;
        }

        const data = await response.json();
        let category = data.choices?.[0]?.message?.content?.toLowerCase().trim() || 'outros';
        
        // Validate category
        if (!CATEGORIES.includes(category as typeof CATEGORIES[number])) {
          // Try to match partial
          const matched = CATEGORIES.find(c => category.includes(c));
          category = matched || 'outros';
        }

        console.log(`Newsletter ${newsletter.id}: ${category}`);

        // Update newsletter with category
        const { error: updateError } = await supabaseClient
          .from('captured_newsletters')
          .update({ category, is_processed: true })
          .eq('id', newsletter.id);

        if (updateError) {
          console.error('Error updating newsletter:', updateError);
        } else {
          results.push({ id: newsletter.id, category });
        }

      } catch (error) {
        console.error(`Error categorizing newsletter ${newsletter.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: `Categorizados ${results.length} newsletters`,
        processed: results.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in categorize-newsletter function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});