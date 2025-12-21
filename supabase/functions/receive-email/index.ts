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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse incoming email from Mailgun/SendGrid webhook
    const contentType = req.headers.get('content-type') || '';
    let emailData: any = {};

    if (contentType.includes('application/json')) {
      emailData = await req.json();
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      emailData = {
        recipient: formData.get('recipient') || formData.get('to'),
        sender: formData.get('sender') || formData.get('from'),
        from: formData.get('from') || formData.get('sender'),
        subject: formData.get('subject'),
        'body-html': formData.get('body-html') || formData.get('html'),
        'body-plain': formData.get('body-plain') || formData.get('text'),
        'stripped-html': formData.get('stripped-html'),
        'stripped-text': formData.get('stripped-text'),
      };
    }

    console.log('Received email webhook:', JSON.stringify(emailData, null, 2));

    const recipient = emailData.recipient || emailData.to || '';
    const fromEmail = emailData.from || emailData.sender || '';
    const subject = emailData.subject || '(sem assunto)';
    const htmlContent = emailData['body-html'] || emailData.html || '';
    const textContent = emailData['body-plain'] || emailData.text || '';

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

    // Extract sender info
    const fromMatch = fromEmail.match(/(?:"?([^"<]+)"?\s*)?<?([^<>@\s]+@[^<>\s]+)>?/);
    const fromName = fromMatch?.[1]?.trim() || null;
    const fromAddress = fromMatch?.[2] || fromEmail;

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
            provider: 'webhook',
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
        from_email: fromAddress,
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
      updateData.sender_name = fromName || fromAddress;
    }

    if (aliasId) {
      await supabase
        .from('email_aliases')
        .update(updateData)
        .eq('id', aliasId);
    }

    console.log('Email saved successfully:', newsletter.id);

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
      // Don't fail the request if AI analysis fails
    }

    return new Response(JSON.stringify({ 
      success: true, 
      id: newsletter.id,
      alias: alias,
      optin_status: optinStatus,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing email:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
