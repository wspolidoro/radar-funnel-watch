import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract confirmation links from email content
function extractConfirmationLink(html: string, text: string): string | null {
  const content = html || text || '';
  
  // Common confirmation link patterns
  const patterns = [
    /href=["']([^"']*(?:confirm|verify|activate|opt-?in|subscribe|validate)[^"']*)["']/gi,
    /href=["']([^"']*(?:click|action|track)[^"']*(?:confirm|verify)[^"']*)["']/gi,
    /(https?:\/\/[^\s<>"']+(?:confirm|verify|activate|opt-?in|subscribe)[^\s<>"']*)/gi,
  ];

  for (const pattern of patterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      // Extract URL from href if present
      const hrefMatch = matches[0].match(/href=["']([^"']+)["']/i);
      if (hrefMatch) return hrefMatch[1];
      
      // Otherwise return the URL directly
      const urlMatch = matches[0].match(/https?:\/\/[^\s<>"']+/);
      if (urlMatch) return urlMatch[0];
    }
  }

  return null;
}

// Detect opt-in status from email content
function detectOptinStatus(subject: string, html: string, text: string): string {
  const content = `${subject} ${html || ''} ${text || ''}`.toLowerCase();
  
  const confirmationKeywords = [
    'confirm', 'verify', 'activate', 'opt-in', 'optin',
    'confirme', 'verificar', 'ativar', 'confirmar sua inscrição',
    'please confirm', 'confirm your', 'verify your email',
    'confirm subscription', 'confirmar cadastro'
  ];

  for (const keyword of confirmationKeywords) {
    if (content.includes(keyword)) {
      return 'needs_confirmation';
    }
  }

  return 'confirmed';
}

// Extract CTAs from email
function extractCTAs(html: string): { text: string; url: string }[] {
  const ctas: { text: string; url: string }[] = [];
  
  // Match anchor tags with button-like classes or styles
  const buttonPatterns = [
    /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi,
    /<a[^>]*class=["'][^"']*(?:button|btn|cta)[^"']*["'][^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi,
  ];

  for (const pattern of buttonPatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      const url = match[1];
      const text = match[2].trim().replace(/<[^>]+>/g, '');
      if (text && url && !url.startsWith('mailto:') && !url.startsWith('#')) {
        ctas.push({ text, url });
      }
    }
  }

  return ctas.slice(0, 10); // Limit to 10 CTAs
}

// Count links in email
function countLinks(html: string): number {
  const matches = html.match(/href=["']https?:\/\/[^"']+["']/gi);
  return matches ? matches.length : 0;
}

// Check if email has images
function hasImages(html: string): boolean {
  return /<img[^>]+src=/i.test(html);
}

// Count words in text content
function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Parse Maileroo webhook format
function parseMailerooPayload(data: any): {
  recipient: string;
  fromEmail: string;
  fromName: string | null;
  subject: string;
  htmlContent: string;
  textContent: string;
  spfResult: string | null;
  dkimResult: string | null;
  isDmarcAligned: boolean | null;
  isSpam: boolean | null;
  validationUrl: string | null;
  deletionUrl: string | null;
} {
  // Maileroo sends recipients as array, from in headers
  const recipients = data.recipients || [];
  const recipient = recipients[0] || '';
  
  // Extract from header
  const headers = data.headers || {};
  const fromHeader = headers.From || [];
  const fromRaw = fromHeader[0] || '';
  
  // Parse from field: "Name <email>" or just "email"
  const fromMatch = fromRaw.match(/(?:"?([^"<]+)"?\s*)?<?([^<>@\s]+@[^<>\s]+)>?/);
  const fromName = fromMatch?.[1]?.trim() || null;
  const fromEmail = fromMatch?.[2] || fromRaw;
  
  // Subject from headers
  const subjectArray = headers.Subject || [];
  const subject = subjectArray[0] || '(sem assunto)';
  
  // Body content
  const body = data.body || {};
  const htmlContent = body.html || '';
  const textContent = body.plaintext || '';
  
  // Security fields
  const spfResult = data.spf_result || null;
  const dkimResult = data.dkim_result || null;
  const isDmarcAligned = data.is_dmarc_aligned ?? null;
  const isSpam = data.is_spam ?? null;
  
  // URLs for validation and deletion
  const validationUrl = data.validation_url || null;
  const deletionUrl = data.deletion_url || null;
  
  return {
    recipient,
    fromEmail,
    fromName,
    subject,
    htmlContent,
    textContent,
    spfResult,
    dkimResult,
    isDmarcAligned,
    isSpam,
    validationUrl,
    deletionUrl,
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let logId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming email from Maileroo webhook (JSON format)
    const contentType = req.headers.get('content-type') || '';
    let emailData: any = {};
    let isMailerooFormat = false;

    if (contentType.includes('application/json')) {
      emailData = await req.json();
      // Detect Maileroo format by checking for specific fields
      if (emailData.recipients && emailData.headers && emailData.body) {
        isMailerooFormat = true;
      }
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      // Legacy format support (Mailgun/SendGrid)
      const formData = await req.formData();
      emailData = {
        recipient: formData.get('recipient') || formData.get('to'),
        sender: formData.get('sender') || formData.get('from'),
        from: formData.get('from') || formData.get('sender'),
        subject: formData.get('subject'),
        'body-html': formData.get('body-html') || formData.get('html'),
        'body-plain': formData.get('body-plain') || formData.get('text'),
      };
    }

    console.log('Received email webhook:', JSON.stringify(emailData, null, 2));

    let recipient: string;
    let fromEmail: string;
    let fromName: string | null;
    let subject: string;
    let htmlContent: string;
    let textContent: string;

    if (isMailerooFormat) {
      // Parse Maileroo format
      const parsed = parseMailerooPayload(emailData);
      recipient = parsed.recipient;
      fromEmail = parsed.fromEmail;
      fromName = parsed.fromName;
      subject = parsed.subject;
      htmlContent = parsed.htmlContent;
      textContent = parsed.textContent;

      // Validate the email with Maileroo if validation_url is present
      if (parsed.validationUrl) {
        try {
          console.log('Validating email with Maileroo:', parsed.validationUrl);
          await fetch(parsed.validationUrl, { method: 'POST' });
        } catch (validationError) {
          console.error('Failed to validate with Maileroo:', validationError);
        }
      }

      // Log security info
      console.log('Email security info:', {
        spf: parsed.spfResult,
        dkim: parsed.dkimResult,
        dmarc_aligned: parsed.isDmarcAligned,
        is_spam: parsed.isSpam,
      });
    } else {
      // Legacy format
      recipient = emailData.recipient || emailData.to || '';
      const fromRaw = emailData.from || emailData.sender || '';
      const fromMatch = fromRaw.match(/(?:"?([^"<]+)"?\s*)?<?([^<>@\s]+@[^<>\s]+)>?/);
      fromName = fromMatch?.[1]?.trim() || null;
      fromEmail = fromMatch?.[2] || fromRaw;
      subject = emailData.subject || '(sem assunto)';
      htmlContent = emailData['body-html'] || emailData.html || '';
      textContent = emailData['body-plain'] || emailData.text || '';
    }

    if (!recipient) {
      console.error('No recipient found in webhook data');
      return new Response(JSON.stringify({ error: 'No recipient found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Extract local part and domain from recipient
    const recipientMatch = recipient.match(/<?([^<>@]+)@([^<>\s]+)>?/);
    if (!recipientMatch) {
      console.error('Invalid recipient format:', recipient);
      return new Response(JSON.stringify({ error: 'Invalid recipient format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const localPart = recipientMatch[1];
    const domain = recipientMatch[2];
    const alias = `${localPart}@${domain}`;

    // Create initial email log entry
    const { data: logData } = await supabase
      .from('email_logs')
      .insert({
        domain,
        alias,
        from_email: fromEmail,
        from_name: fromName,
        subject,
        status: 'received',
        metadata: { raw_recipient: recipient },
      })
      .select('id')
      .single();

    logId = logData?.id || null;
    console.log('Created email log:', logId);

    // Find the alias in database
    const { data: aliasData, error: aliasError } = await supabase
      .from('email_aliases')
      .select('*')
      .eq('alias', alias)
      .maybeSingle();

    if (aliasError) {
      console.error('Error finding alias:', aliasError);
      return new Response(JSON.stringify({ error: 'Database error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no alias found, try to create one (for catch-all domains)
    let aliasId = aliasData?.id;
    let userId = aliasData?.user_id;

    if (!aliasData) {
      // Find domain to get user_id
      const { data: domainData } = await supabase
        .from('email_domains')
        .select('*')
        .eq('domain', domain)
        .eq('is_active', true)
        .maybeSingle();

      if (domainData) {
        // Auto-create alias for catch-all domain
        const { data: newAlias, error: createError } = await supabase
          .from('email_aliases')
          .insert({
            user_id: domainData.user_id,
            alias: alias,
            local_part: localPart,
            domain: domain,
            name: localPart,
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating alias:', createError);
        } else {
          aliasId = newAlias.id;
          userId = newAlias.user_id;
        }
      } else {
        console.log('No matching alias or domain found for:', alias);
        return new Response(JSON.stringify({ message: 'Alias not found, email discarded' }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Analyze email content
    const confirmationLink = extractConfirmationLink(htmlContent, textContent);
    const optinStatus = detectOptinStatus(subject, htmlContent, textContent);
    const ctas = extractCTAs(htmlContent);
    const linksCount = countLinks(htmlContent);
    const wordCount = countWords(textContent);
    const emailHasImages = hasImages(htmlContent);

    // Find or create email_seed for this alias (for backward compatibility)
    let seedId = null;
    if (userId) {
      const { data: seedData } = await supabase
        .from('email_seeds')
        .select('id')
        .eq('user_id', userId)
        .eq('email', alias)
        .maybeSingle();

      if (seedData) {
        seedId = seedData.id;
      } else {
        // Create a seed for this alias
        const { data: newSeed } = await supabase
          .from('email_seeds')
          .insert({
            user_id: userId,
            email: alias,
            name: aliasData?.name || localPart,
            provider: 'maileroo',
            is_active: true,
          })
          .select()
          .single();

        if (newSeed) {
          seedId = newSeed.id;
        }
      }
    }

    // Insert the newsletter
    const { data: newsletter, error: insertError } = await supabase
      .from('captured_newsletters')
      .insert({
        seed_id: seedId,
        alias_id: aliasId,
        subject: subject,
        from_email: fromEmail,
        from_name: fromName,
        html_content: htmlContent,
        text_content: textContent,
        received_at: new Date().toISOString(),
        optin_status: optinStatus,
        confirmation_link: confirmationLink,
        ctas: ctas,
        links_count: linksCount,
        word_count: wordCount,
        has_images: emailHasImages,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting newsletter:', insertError);
      return new Response(JSON.stringify({ error: 'Failed to save email' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update alias with first_email_at and increment email_count
    const updateData: any = {
      email_count: (aliasData?.email_count || 0) + 1,
    };

    if (!aliasData?.first_email_at) {
      updateData.first_email_at = new Date().toISOString();
      updateData.sender_name = fromName || fromEmail;
    }

    if (aliasId) {
      await supabase
        .from('email_aliases')
        .update(updateData)
        .eq('id', aliasId);
    }

    const processingTime = Date.now() - startTime;
    console.log('Email saved successfully:', newsletter.id, `(${processingTime}ms)`);

    // Check if this is a connectivity test email
    if (subject.startsWith('[TEST-') && localPart.startsWith('connectivity-test-')) {
      const testIdMatch = subject.match(/\[TEST-([a-f0-9-]+)\]/);
      if (testIdMatch) {
        console.log('Detected connectivity test email, updating test record...');
        const { error: testUpdateError } = await supabase
          .from('connectivity_tests')
          .update({
            status: 'success',
            received_at: new Date().toISOString(),
            latency_ms: processingTime,
          })
          .eq('test_alias', alias);

        if (testUpdateError) {
          console.error('Failed to update connectivity test:', testUpdateError);
        }
      }
    }

    // Update email log as processed
    if (logId) {
      await supabase
        .from('email_logs')
        .update({
          status: 'processed',
          processing_time_ms: processingTime,
          newsletter_id: newsletter.id,
        })
        .eq('id', logId);
    }

    // Trigger AI analysis asynchronously
    try {
      const analyzeUrl = `${supabaseUrl}/functions/v1/analyze-newsletter`;
      fetch(analyzeUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ newsletterId: newsletter.id }),
      }).catch(err => console.error('AI analysis trigger failed:', err));
      
      console.log('AI analysis triggered for newsletter:', newsletter.id);
    } catch (analysisError) {
      console.error('Failed to trigger AI analysis:', analysisError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      id: newsletter.id,
      alias: alias,
      optin_status: optinStatus,
      processing_time_ms: processingTime,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const processingTime = Date.now() - startTime;

    // Update log as error if we have a logId
    if (logId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      await supabase
        .from('email_logs')
        .update({
          status: 'error',
          error_message: errorMessage,
          processing_time_ms: processingTime,
        })
        .eq('id', logId);
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
