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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { domainId, domain } = await req.json();

    if (!domain) {
      return new Response(JSON.stringify({ error: 'Domain is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Verifying DNS for domain: ${domain}`);

    // Expected MX record for Maileroo
    const expectedMX = 'mx.maileroo.com';

    let mxRecords: { preference: number; exchange: string }[] = [];
    let dnsStatus = 'error';
    let errorMessage: string | null = null;

    try {
      // Use Deno's DNS resolver to get MX records
      const records = await Deno.resolveDns(domain, "MX");
      console.log('MX Records found:', records);

      mxRecords = records.map((record: { preference: number; exchange: string }) => ({
        preference: record.preference,
        exchange: record.exchange.replace(/\.$/, ''), // Remove trailing dot
      }));

      // Check if any MX record points to Maileroo
      const hasCorrectMX = mxRecords.some(
        (record) => record.exchange.toLowerCase() === expectedMX.toLowerCase()
      );

      dnsStatus = hasCorrectMX ? 'verified' : 'incorrect';
    } catch (dnsError) {
      console.error('DNS lookup error:', dnsError);
      errorMessage = dnsError instanceof Error ? dnsError.message : 'DNS lookup failed';
      
      if (errorMessage.includes('NXDOMAIN') || errorMessage.includes('no such host')) {
        dnsStatus = 'no_records';
        errorMessage = 'Nenhum registro MX encontrado para este domínio';
      } else if (errorMessage.includes('SERVFAIL')) {
        dnsStatus = 'dns_error';
        errorMessage = 'Erro no servidor DNS ao consultar registros';
      }
    }

    const result = {
      domain,
      expected_mx: expectedMX,
      found_mx: mxRecords,
      status: dnsStatus,
      is_correct: dnsStatus === 'verified',
      error: errorMessage,
      checked_at: new Date().toISOString(),
    };

    // Update domain record if domainId provided
    if (domainId) {
      const { error: updateError } = await supabase
        .from('email_domains')
        .update({
          mx_records: mxRecords,
          dns_status: dnsStatus,
          dns_verified_at: new Date().toISOString(),
          is_verified: dnsStatus === 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', domainId);

      if (updateError) {
        console.error('Error updating domain:', updateError);
      }
    }

    console.log('DNS verification result:', result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error verifying DNS:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
