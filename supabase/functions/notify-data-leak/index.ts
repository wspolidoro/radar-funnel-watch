import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DataLeakAlertRequest {
  userId: string;
  userEmail: string;
  aliasId: string;
  aliasName: string;
  newsletterId: string;
  fromEmail: string;
  expectedDomain: string;
  actualDomain: string;
  subject: string;
  severity: "low" | "warning" | "critical";
}

const handler = async (req: Request): Promise<Response> => {
  console.log("notify-data-leak function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const {
      userId,
      userEmail,
      aliasId,
      aliasName,
      newsletterId,
      fromEmail,
      expectedDomain,
      actualDomain,
      subject,
      severity,
    }: DataLeakAlertRequest = await req.json();

    console.log(`Processing data leak alert for user ${userId}, alias ${aliasName}`);

    // Store the alert in the database
    const { data: alert, error: insertError } = await supabaseClient
      .from("data_leak_alerts")
      .insert({
        user_id: userId,
        alias_id: aliasId,
        newsletter_id: newsletterId,
        from_email: fromEmail,
        expected_domain: expectedDomain,
        actual_domain: actualDomain,
        severity,
        is_notified: true,
        notified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error inserting alert:", insertError);
      throw insertError;
    }

    console.log("Alert stored in database:", alert.id);

    // Determine severity styling
    const severityColors = {
      low: { bg: "#fef3c7", text: "#92400e", label: "Baixa" },
      warning: { bg: "#fed7aa", text: "#c2410c", label: "Média" },
      critical: { bg: "#fecaca", text: "#991b1b", label: "Crítica" },
    };

    const style = severityColors[severity];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔍 Alerta de Vazamento de Dados</h1>
        </div>
        
        <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
          <div style="background: ${style.bg}; color: ${style.text}; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; display: inline-block;">
            <strong>Severidade: ${style.label}</strong>
          </div>
          
          <h2 style="color: #1f2937; margin-top: 0;">Detecção Suspeita</h2>
          
          <p>Identificamos um email que pode indicar vazamento dos seus dados:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold; width: 140px;">Alias utilizado:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${aliasName}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Remetente:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${fromEmail}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Domínio esperado:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${expectedDomain || "Não definido"}</td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Domínio recebido:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #dc2626;"><strong>${actualDomain}</strong></td>
            </tr>
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Assunto:</td>
              <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${subject}</td>
            </tr>
          </table>
          
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="margin: 0 0 8px 0; color: #1e40af;">O que isso significa?</h3>
            <p style="margin: 0; color: #1e3a8a;">
              O alias <strong>${aliasName}</strong> foi criado para um serviço específico, mas recebeu um email de um domínio diferente do esperado. 
              Isso pode indicar que seus dados foram compartilhados ou vendidos para terceiros.
            </p>
          </div>
          
          <h3 style="color: #1f2937;">Recomendações:</h3>
          <ul style="color: #4b5563;">
            <li>Verifique se você se inscreveu recentemente em algum serviço usando este alias</li>
            <li>Considere marcar o remetente original como suspeito</li>
            <li>Se confirmado o vazamento, você pode usar essa informação como prova</li>
          </ul>
        </div>
        
        <div style="background: #1f2937; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #9ca3af; margin: 0; font-size: 14px;">
            Newsletter Spy - Protegendo seus dados de email
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email notification via Maileroo
    const mailerooApiKey = Deno.env.get("MAILEROO_API_KEY");
    let emailSent = false;

    if (mailerooApiKey) {
      const emailPayload = {
        from: "Newsletter Spy <alertas@newsletterspy.io>",
        to: userEmail,
        subject: `🚨 Possível vazamento de dados detectado - ${aliasName}`,
        html: htmlContent,
      };

      console.log("Sending email via Maileroo API");

      const emailResponse = await fetch("https://smtp.maileroo.com/send", {
        method: "POST",
        headers: {
          "X-API-Key": mailerooApiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      const emailResult = await emailResponse.json();

      if (!emailResponse.ok) {
        console.error("Maileroo API error:", emailResult);
      } else {
        console.log("Email notification sent successfully:", emailResult);
        emailSent = true;
      }
    } else {
      console.warn("MAILEROO_API_KEY not configured, skipping email notification");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertId: alert.id,
        emailSent 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in notify-data-leak function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
