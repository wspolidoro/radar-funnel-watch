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

    console.log('Starting scheduled DNS verification for all platform domains...');

    // Get all active platform domains
    const { data: domains, error: domainsError } = await supabase
      .from('email_domains')
      .select('id, domain, dns_status')
      .eq('is_platform_domain', true)
      .eq('is_active', true);

    if (domainsError) {
      throw new Error(`Failed to fetch domains: ${domainsError.message}`);
    }

    console.log(`Found ${domains?.length || 0} active platform domains to verify`);

    const results = [];
    const expectedMX = 'mx.maileroo.com';

    for (const domain of domains || []) {
      console.log(`Verifying DNS for: ${domain.domain}`);
      
      let mxRecords: { preference: number; exchange: string }[] = [];
      let dnsStatus = 'error';
      let errorMessage: string | null = null;

      try {
        const records = await Deno.resolveDns(domain.domain, "MX");
        
        mxRecords = records.map((record: { preference: number; exchange: string }) => ({
          preference: record.preference,
          exchange: record.exchange.replace(/\.$/, ''),
        }));

        const hasCorrectMX = mxRecords.some(
          (record) => record.exchange.toLowerCase() === expectedMX.toLowerCase()
        );

        dnsStatus = hasCorrectMX ? 'verified' : 'incorrect';
      } catch (dnsError) {
        console.error(`DNS lookup error for ${domain.domain}:`, dnsError);
        errorMessage = dnsError instanceof Error ? dnsError.message : 'DNS lookup failed';
        
        if (errorMessage.includes('NXDOMAIN') || errorMessage.includes('no such host')) {
          dnsStatus = 'no_records';
        } else {
          dnsStatus = 'dns_error';
        }
      }

      // Update domain record
      const { error: updateError } = await supabase
        .from('email_domains')
        .update({
          mx_records: mxRecords,
          dns_status: dnsStatus,
          dns_verified_at: new Date().toISOString(),
          is_verified: dnsStatus === 'verified',
          updated_at: new Date().toISOString(),
        })
        .eq('id', domain.id);

      if (updateError) {
        console.error(`Failed to update domain ${domain.domain}:`, updateError);
      }

      // Create alert if DNS status changed from verified to something else
      if (domain.dns_status === 'verified' && dnsStatus !== 'verified') {
        console.log(`DNS status changed for ${domain.domain}: ${domain.dns_status} -> ${dnsStatus}`);
        
        const { data: domainData } = await supabase
          .from('email_domains')
          .select('user_id')
          .eq('id', domain.id)
          .single();

        if (domainData?.user_id) {
          await supabase
            .from('data_leak_alerts')
            .insert({
              user_id: domainData.user_id,
              from_email: `dns-cron@${domain.domain}`,
              actual_domain: domain.domain,
              expected_domain: expectedMX,
              severity: dnsStatus === 'no_records' ? 'critical' : 'warning',
              is_notified: false,
              is_read: false,
            });
        }
      }

      results.push({
        domain: domain.domain,
        previous_status: domain.dns_status,
        current_status: dnsStatus,
        mx_records: mxRecords,
        error: errorMessage,
      });
    }

    const summary = {
      total: results.length,
      verified: results.filter(r => r.current_status === 'verified').length,
      failed: results.filter(r => r.current_status !== 'verified').length,
      checked_at: new Date().toISOString(),
    };

    console.log('DNS verification cron completed:', summary);

    return new Response(JSON.stringify({ 
      success: true, 
      summary,
      results 
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in DNS verification cron:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
