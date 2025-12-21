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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { newsletterId } = await req.json();

    if (!newsletterId) {
      return new Response(JSON.stringify({ error: 'newsletterId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the newsletter
    const { data: newsletter, error: fetchError } = await supabase
      .from('captured_newsletters')
      .select('*')
      .eq('id', newsletterId)
      .single();

    if (fetchError || !newsletter) {
      return new Response(JSON.stringify({ error: 'Newsletter not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Prepare content for analysis
    const textContent = newsletter.text_content || '';
    const htmlContent = newsletter.html_content || '';
    const subject = newsletter.subject || '';

    // Extract text from HTML if no text content
    let analysisContent = textContent;
    if (!analysisContent && htmlContent) {
      analysisContent = htmlContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    // Call Lovable AI for analysis
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `Você é um especialista em análise de email marketing. Analise o email fornecido e retorne um JSON com os seguintes campos:
- email_type: "marketing" | "institucional" | "vendas" | "educacional" | "transacional" | "newsletter" | "promocional"
- sentiment: "positivo" | "neutro" | "urgente" | "persuasivo"
- target_audience: descrição breve do público-alvo inferido
- main_topics: array de 3-5 tópicos principais
- cta_analysis: análise dos CTAs encontrados
- marketing_insights: 2-3 insights de marketing estratégico
- category: "onboarding" | "promo" | "educacao" | "reengajamento" | "sazonal" (categoria principal)

Responda APENAS com o JSON, sem markdown ou explicações.`
          },
          {
            role: 'user',
            content: `Assunto: ${subject}\n\nConteúdo:\n${analysisContent.substring(0, 3000)}`
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const analysisText = aiResponse.choices[0]?.message?.content || '{}';
    
    // Parse the analysis
    let analysis;
    try {
      // Clean the response in case it has markdown
      const cleanJson = analysisText.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleanJson);
    } catch (e) {
      console.error('Failed to parse AI response:', analysisText);
      analysis = {
        email_type: 'newsletter',
        sentiment: 'neutro',
        category: 'educacao',
      };
    }

    // Update the newsletter with analysis
    const { error: updateError } = await supabase
      .from('captured_newsletters')
      .update({
        email_type: analysis.email_type,
        sentiment: analysis.sentiment,
        category: analysis.category,
        analyzed_at: new Date().toISOString(),
      })
      .eq('id', newsletterId);

    if (updateError) {
      console.error('Error updating newsletter:', updateError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error analyzing newsletter:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
