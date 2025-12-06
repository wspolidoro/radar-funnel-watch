import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncRequest {
  seedId: string;
  password?: string;
}

interface EmailMessage {
  uid: string;
  from: string;
  fromName: string | null;
  subject: string;
  date: Date;
  htmlContent: string | null;
  textContent: string | null;
}

class ImapClient {
  private conn: Deno.TlsConn | Deno.TcpConn | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private buffer = "";
  private tagCounter = 0;
  private host: string;
  private port: number;
  private useSsl: boolean;

  constructor(host: string, port: number, useSsl: boolean = true) {
    this.host = host;
    this.port = port;
    this.useSsl = useSsl;
  }

  private getTag(): string {
    return `A${String(++this.tagCounter).padStart(4, '0')}`;
  }

  private async readResponse(tag: string): Promise<string[]> {
    const lines: string[] = [];
    const decoder = new TextDecoder();
    
    while (true) {
      if (this.buffer.includes('\r\n')) {
        const lineEnd = this.buffer.indexOf('\r\n');
        const line = this.buffer.substring(0, lineEnd);
        this.buffer = this.buffer.substring(lineEnd + 2);
        lines.push(line);
        
        if (line.startsWith(tag + ' ')) {
          break;
        }
      } else {
        const result = await this.reader!.read();
        if (result.done) break;
        this.buffer += decoder.decode(result.value);
      }
    }
    
    return lines;
  }

  private async sendCommand(command: string): Promise<string[]> {
    const tag = this.getTag();
    const encoder = new TextEncoder();
    const fullCommand = `${tag} ${command}\r\n`;
    
    const writer = this.conn!.writable.getWriter();
    await writer.write(encoder.encode(fullCommand));
    writer.releaseLock();
    
    return await this.readResponse(tag);
  }

  async connect(): Promise<void> {
    console.log(`Connecting to ${this.host}:${this.port} (SSL: ${this.useSsl})`);
    
    if (this.useSsl) {
      this.conn = await Deno.connectTls({
        hostname: this.host,
        port: this.port,
      });
    } else {
      this.conn = await Deno.connect({
        hostname: this.host,
        port: this.port,
      });
    }
    
    this.reader = this.conn.readable.getReader();
    
    // Read server greeting
    const decoder = new TextDecoder();
    const result = await this.reader.read();
    if (!result.done) {
      const greeting = decoder.decode(result.value);
      console.log('Server greeting:', greeting.trim());
    }
  }

  async login(email: string, password: string): Promise<boolean> {
    const response = await this.sendCommand(`LOGIN "${email}" "${password}"`);
    const lastLine = response[response.length - 1] || '';
    console.log('Login response:', lastLine);
    return lastLine.includes(' OK ');
  }

  async selectMailbox(mailbox: string = 'INBOX'): Promise<number> {
    const response = await this.sendCommand(`SELECT "${mailbox}"`);
    let messageCount = 0;
    
    for (const line of response) {
      const match = line.match(/\* (\d+) EXISTS/);
      if (match) {
        messageCount = parseInt(match[1]);
      }
    }
    
    console.log(`Mailbox ${mailbox} has ${messageCount} messages`);
    return messageCount;
  }

  async searchUnseen(): Promise<string[]> {
    const response = await this.sendCommand('SEARCH UNSEEN');
    const uids: string[] = [];
    
    for (const line of response) {
      if (line.startsWith('* SEARCH')) {
        const parts = line.substring(9).trim().split(' ');
        uids.push(...parts.filter(p => p.length > 0));
      }
    }
    
    console.log(`Found ${uids.length} unseen messages`);
    return uids;
  }

  async fetchMessage(uid: string): Promise<EmailMessage | null> {
    try {
      // Fetch envelope and body
      const response = await this.sendCommand(
        `FETCH ${uid} (ENVELOPE BODY[TEXT] BODY[HEADER.FIELDS (FROM SUBJECT DATE CONTENT-TYPE)])`
      );
      
      let from = '';
      let fromName: string | null = null;
      let subject = '';
      let date = new Date();
      let textContent: string | null = null;
      let htmlContent: string | null = null;
      
      const fullResponse = response.join('\n');
      
      // Parse From header
      const fromMatch = fullResponse.match(/From:\s*(?:"?([^"<]+)"?\s*)?<?([^>\s]+)>?/i);
      if (fromMatch) {
        fromName = fromMatch[1]?.trim() || null;
        from = fromMatch[2] || '';
      }
      
      // Parse Subject
      const subjectMatch = fullResponse.match(/Subject:\s*(.+?)(?:\r?\n(?!\s)|$)/is);
      if (subjectMatch) {
        subject = subjectMatch[1].replace(/\r?\n\s*/g, ' ').trim();
      }
      
      // Parse Date
      const dateMatch = fullResponse.match(/Date:\s*(.+?)(?:\r?\n(?!\s)|$)/i);
      if (dateMatch) {
        try {
          date = new Date(dateMatch[1].trim());
        } catch {
          date = new Date();
        }
      }
      
      // Get body content
      const bodyStart = fullResponse.indexOf('BODY[TEXT]');
      if (bodyStart !== -1) {
        const contentStart = fullResponse.indexOf('{', bodyStart);
        if (contentStart !== -1) {
          const lengthEnd = fullResponse.indexOf('}', contentStart);
          const content = fullResponse.substring(lengthEnd + 2);
          
          // Check if it's HTML
          if (content.includes('<html') || content.includes('<body') || content.includes('<div')) {
            htmlContent = content;
          } else {
            textContent = content;
          }
        }
      }
      
      return {
        uid,
        from,
        fromName,
        subject,
        date,
        htmlContent,
        textContent
      };
    } catch (error) {
      console.error(`Error fetching message ${uid}:`, error);
      return null;
    }
  }

  async logout(): Promise<void> {
    try {
      await this.sendCommand('LOGOUT');
    } catch {
      // Ignore logout errors
    }
  }

  async close(): Promise<void> {
    try {
      this.reader?.releaseLock();
      this.conn?.close();
    } catch {
      // Ignore close errors
    }
  }
}

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

    const { seedId, password }: SyncRequest = await req.json();

    const { data: seed, error: seedError } = await supabaseClient
      .from('email_seeds')
      .select('*')
      .eq('id', seedId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (seedError || !seed) {
      return new Response(
        JSON.stringify({ error: 'Seed not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get IMAP credentials
    const imapPassword = password || seed.encrypted_password;
    if (!imapPassword) {
      return new Response(
        JSON.stringify({ error: 'Password is required for IMAP connection' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save password for future use if provided
    if (password && password !== seed.encrypted_password) {
      await supabaseClient
        .from('email_seeds')
        .update({ encrypted_password: password })
        .eq('id', seedId);
    }

    // Determine IMAP host
    let imapHost = seed.imap_host;
    const imapPort = seed.imap_port || 993;
    const useSsl = seed.use_ssl !== false;

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

    console.log(`Starting IMAP sync for ${seed.email} via ${imapHost}:${imapPort}`);

    const client = new ImapClient(imapHost, imapPort, useSsl);
    
    try {
      await client.connect();
      console.log('Connected to IMAP server');

      const loginSuccess = await client.login(seed.email, imapPassword);
      if (!loginSuccess) {
        throw new Error('IMAP login failed - check credentials');
      }
      console.log('Logged in successfully');

      await client.selectMailbox('INBOX');
      const unseenUids = await client.searchUnseen();
      
      const syncedMessages: EmailMessage[] = [];
      const maxMessages = 20; // Limit to prevent timeout
      
      for (let i = 0; i < Math.min(unseenUids.length, maxMessages); i++) {
        const message = await client.fetchMessage(unseenUids[i]);
        if (message && message.from) {
          syncedMessages.push(message);
          
          // Insert into captured_newsletters
          const { error: insertError } = await supabaseClient
            .from('captured_newsletters')
            .insert({
              seed_id: seedId,
              from_email: message.from,
              from_name: message.fromName,
              subject: message.subject,
              received_at: message.date.toISOString(),
              html_content: message.htmlContent,
              text_content: message.textContent,
              is_processed: false
            });
          
          if (insertError) {
            console.error('Error inserting newsletter:', insertError);
          }
        }
      }
      
      await client.logout();
      
      // Update last sync timestamp
      await supabaseClient
        .from('email_seeds')
        .update({ 
          last_sync_at: new Date().toISOString(),
          is_active: true 
        })
        .eq('id', seedId);

      console.log(`Sync completed: ${syncedMessages.length} new newsletters captured`);

      return new Response(
        JSON.stringify({ 
          success: true,
          message: `Sincronização concluída`,
          syncedCount: syncedMessages.length,
          totalUnseen: unseenUids.length,
          details: {
            host: imapHost,
            port: imapPort,
            email: seed.email,
            lastSync: new Date().toISOString()
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } finally {
      await client.close();
    }

  } catch (error: unknown) {
    console.error('Error in sync-imap function:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});