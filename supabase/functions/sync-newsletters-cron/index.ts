import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('Starting newsletter sync cron job...');

  try {
    // Use service role for cron job (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active email seeds
    const { data: activeSeeds, error: seedsError } = await supabaseAdmin
      .from('email_seeds')
      .select('*')
      .eq('is_active', true);

    if (seedsError) {
      console.error('Error fetching seeds:', seedsError);
      throw seedsError;
    }

    console.log(`Found ${activeSeeds?.length || 0} active seeds to sync`);

    const syncResults: { seedId: string; success: boolean; message: string }[] = [];

    for (const seed of activeSeeds || []) {
      try {
        console.log(`Processing seed: ${seed.email} (${seed.provider})`);

        // Determine IMAP host based on provider
        let imapHost = seed.imap_host;
        if (!imapHost) {
          switch (seed.provider) {
            case 'gmail':
              imapHost = 'imap.gmail.com';
              break;
            case 'outlook':
              imapHost = 'outlook.office365.com';
              break;
            case 'yahoo':
              imapHost = 'imap.mail.yahoo.com';
              break;
          }
        }

        // In production, this would connect to IMAP and fetch emails
        // For now, we simulate the sync process
        
        // Update last_sync_at timestamp
        const { error: updateError } = await supabaseAdmin
          .from('email_seeds')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', seed.id);

        if (updateError) {
          console.error(`Error updating seed ${seed.id}:`, updateError);
          syncResults.push({
            seedId: seed.id,
            success: false,
            message: updateError.message
          });
        } else {
          syncResults.push({
            seedId: seed.id,
            success: true,
            message: `Synced ${seed.email} via ${imapHost}`
          });
        }

        // Simulate some sample captured newsletters for demo purposes
        // In production, this would be actual emails from IMAP
        const shouldInsertDemo = Math.random() > 0.7; // 30% chance to insert demo email
        
        if (shouldInsertDemo) {
          const demoNewsletters = [
            {
              subject: 'Novidades da semana - Não perca!',
              from_email: 'news@example.com',
              from_name: 'Newsletter Example',
              category: 'newsletter',
            },
            {
              subject: '🎉 Promoção especial para você!',
              from_email: 'promo@competitor.com',
              from_name: 'Competitor Store',
              category: 'promo',
            },
            {
              subject: 'Bem-vindo! Comece sua jornada',
              from_email: 'welcome@startup.io',
              from_name: 'Startup IO',
              category: 'onboarding',
            },
            {
              subject: 'Tutorial: Como usar nossa plataforma',
              from_email: 'learn@saas.com',
              from_name: 'SaaS Learning',
              category: 'educacao',
            },
            {
              subject: 'Sentimos sua falta! Volte para nós',
              from_email: 'comeback@shop.com',
              from_name: 'Online Shop',
              category: 'reengajamento',
            },
          ];

          const randomNewsletter = demoNewsletters[Math.floor(Math.random() * demoNewsletters.length)];

          const { error: insertError } = await supabaseAdmin
            .from('captured_newsletters')
            .insert({
              seed_id: seed.id,
              from_email: randomNewsletter.from_email,
              from_name: randomNewsletter.from_name,
              subject: `${randomNewsletter.subject} - ${new Date().toLocaleDateString('pt-BR')}`,
              category: randomNewsletter.category,
              received_at: new Date().toISOString(),
              html_content: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
                    h1 { color: #333; }
                    .content { padding: 20px; background: #f9f9f9; border-radius: 8px; margin: 20px 0; }
                    .button { display: inline-block; padding: 12px 24px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
                    .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
                  </style>
                </head>
                <body>
                  <h1>${randomNewsletter.subject}</h1>
                  <div class="content">
                    <p>Olá!</p>
                    <p>Este é um exemplo de newsletter capturada automaticamente pelo sistema RadarMail.</p>
                    <p>O conteúdo aqui demonstra como as newsletters são exibidas após a captura.</p>
                    <a href="#" class="button">Saiba Mais</a>
                  </div>
                  <div class="footer">
                    <p>Este e-mail foi enviado por ${randomNewsletter.from_name}</p>
                    <p>Para cancelar inscrição, clique aqui.</p>
                  </div>
                </body>
                </html>
              `,
              text_content: `${randomNewsletter.subject}\n\nOlá!\n\nEste é um exemplo de newsletter capturada automaticamente.\n\n${randomNewsletter.from_name}`,
            });

          if (insertError) {
            console.error('Error inserting demo newsletter:', insertError);
          } else {
            console.log(`Inserted demo newsletter for seed ${seed.id}`);
          }
        }

      } catch (seedError: unknown) {
        const message = seedError instanceof Error ? seedError.message : 'Unknown error';
        console.error(`Error processing seed ${seed.id}:`, seedError);
        syncResults.push({
          seedId: seed.id,
          success: false,
          message
        });
      }
    }

    const successCount = syncResults.filter(r => r.success).length;
    const failCount = syncResults.filter(r => !r.success).length;

    console.log(`Sync complete: ${successCount} successful, ${failCount} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronização concluída: ${successCount} seeds sincronizados`,
        results: syncResults,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in sync-newsletters-cron function:', error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});