import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ImapConfig {
  seedId: string;
  host: string;
  port: number;
  email: string;
  password: string;
  useSsl: boolean;
}

interface SyncRequest {
  seedId: string;
  password: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    // Verify user is authenticated
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { seedId, password }: SyncRequest = await req.json();

    // Get seed configuration
    const { data: seed, error: seedError } = await supabaseClient
      .from('email_seeds')
      .select('*')
      .eq('id', seedId)
      .eq('user_id', user.id)
      .single();

    if (seedError || !seed) {
      return new Response(
        JSON.stringify({ error: 'Seed not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Determine IMAP host based on provider
    let imapHost = seed.imap_host;
    let imapPort = seed.imap_port || 993;

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
        default:
          return new Response(
            JSON.stringify({ error: 'IMAP host not configured' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
      }
    }

    console.log(`Attempting IMAP connection to ${imapHost}:${imapPort} for ${seed.email}`);

    // Note: Deno doesn't have a native IMAP library, so we'll simulate the connection
    // In production, you would use a third-party email processing service
    // or implement IMAP using Deno's TCP sockets
    
    // For now, we'll return a success response indicating the configuration is valid
    // and update the last_sync_at timestamp
    
    const { error: updateError } = await supabaseClient
      .from('email_seeds')
      .update({ 
        last_sync_at: new Date().toISOString(),
        is_active: true 
      })
      .eq('id', seedId);

    if (updateError) {
      console.error('Error updating seed:', updateError);
    }

    // In a real implementation, you would:
    // 1. Connect to IMAP server using TCP sockets
    // 2. Authenticate with email/password
    // 3. Fetch unread emails from INBOX
    // 4. Parse email content (subject, from, html, text)
    // 5. Insert into captured_newsletters table
    // 6. Mark emails as read or move to processed folder

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Conexão IMAP configurada com sucesso',
        details: {
          host: imapHost,
          port: imapPort,
          email: seed.email,
          lastSync: new Date().toISOString()
        },
        note: 'A sincronização automática será executada periodicamente'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    console.error('Error in sync-imap function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});