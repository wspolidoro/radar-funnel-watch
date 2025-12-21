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
    const mailerooApiKey = Deno.env.get('MAILEROO_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { domainId, domain, userId } = await req.json();

    if (!domain || !domainId || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!mailerooApiKey) {
      return new Response(JSON.stringify({ error: 'Maileroo API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate unique test alias
    const testId = crypto.randomUUID().slice(0, 8);
    const testAlias = `connectivity-test-${testId}@${domain}`;
    const testSubject = `[TEST-${testId}] Connectivity Test`;

    console.log(`Creating connectivity test: ${testAlias}`);

    // Create connectivity test record
    const { data: test, error: insertError } = await supabase
      .from('connectivity_tests')
      .insert({
        domain_id: domainId,
        test_alias: testAlias,
        status: 'pending',
        user_id: userId,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating test record:', insertError);
      throw new Error('Failed to create test record');
    }

    // Create temporary alias to receive the test email
    const { error: aliasError } = await supabase
      .from('email_aliases')
      .insert({
        user_id: userId,
        alias: testAlias,
        local_part: `connectivity-test-${testId}`,
        domain: domain,
        name: 'Teste de Conectividade',
        description: `Teste automático criado em ${new Date().toISOString()}`,
      });

    if (aliasError) {
      console.error('Error creating test alias:', aliasError);
    }

    // Send test email via Maileroo
    const emailPayload = {
      from: `noreply@${domain}`,
      to: testAlias,
      subject: testSubject,
      html: `
        <html>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1>🔬 Teste de Conectividade</h1>
            <p>Este é um email de teste automático para verificar se o domínio <strong>${domain}</strong> está recebendo emails corretamente.</p>
            <p><strong>Test ID:</strong> ${testId}</p>
            <p><strong>Enviado em:</strong> ${new Date().toISOString()}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">Este email foi gerado automaticamente pelo sistema de monitoramento.</p>
          </body>
        </html>
      `,
      plain: `Teste de Conectividade\n\nTest ID: ${testId}\nEnviado em: ${new Date().toISOString()}`,
    };

    console.log('Sending test email via Maileroo...');

    const mailerooResponse = await fetch('https://smtp.maileroo.com/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': mailerooApiKey,
      },
      body: JSON.stringify(emailPayload),
    });

    const mailerooResult = await mailerooResponse.json();
    console.log('Maileroo response:', mailerooResult);

    if (!mailerooResponse.ok) {
      // Update test as failed
      await supabase
        .from('connectivity_tests')
        .update({
          status: 'failed',
          error_message: mailerooResult.message || 'Failed to send test email',
        })
        .eq('id', test.id);

      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to send test email',
        details: mailerooResult,
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update test as sent
    await supabase
      .from('connectivity_tests')
      .update({ status: 'sent' })
      .eq('id', test.id);

    console.log(`Test email sent successfully: ${test.id}`);

    return new Response(JSON.stringify({
      success: true,
      testId: test.id,
      testAlias,
      message: 'Test email sent, waiting for reception',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in connectivity test:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
