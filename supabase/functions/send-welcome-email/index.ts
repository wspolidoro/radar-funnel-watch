import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  userId: string;
  email: string;
  name?: string;
  planName?: string;
}

const handler = async (req: Request): Promise<Response> => {
  console.log("send-welcome-email function invoked");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, name, planName }: WelcomeEmailRequest = await req.json();
    
    console.log(`Sending welcome email to ${email} for user ${userId}`);

    if (!email) {
      throw new Error("Email is required");
    }

    const displayName = name || "Cliente";
    const plan = planName || "Plano Selecionado";

    const emailResponse = await resend.emails.send({
      from: "Newsletter Tracker <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Bem-vindo ao Newsletter Tracker!",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo ao Newsletter Tracker</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">
                        🎉 Bem-vindo ao Newsletter Tracker!
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px; color: #18181b; font-size: 24px;">
                        Olá, ${displayName}!
                      </h2>
                      
                      <p style="margin: 0 0 20px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Sua assinatura do plano <strong style="color: #6366f1;">${plan}</strong> foi confirmada com sucesso! 
                        Estamos muito felizes em ter você conosco.
                      </p>
                      
                      <p style="margin: 0 0 30px; color: #52525b; font-size: 16px; line-height: 1.6;">
                        Com o Newsletter Tracker, você pode:
                      </p>
                      
                      <ul style="margin: 0 0 30px; padding-left: 20px; color: #52525b; font-size: 16px; line-height: 1.8;">
                        <li>📧 Monitorar e rastrear newsletters de concorrentes</li>
                        <li>🔍 Detectar vazamentos de dados automaticamente</li>
                        <li>📊 Analisar tendências e estratégias de email marketing</li>
                        <li>🤖 Obter insights com IA sobre cada newsletter</li>
                        <li>📈 Visualizar métricas e relatórios detalhados</li>
                      </ul>
                      
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app') || '#'}" 
                               style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
                              Acessar o Dashboard
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <div style="margin-top: 30px; padding: 20px; background-color: #f4f4f5; border-radius: 8px;">
                        <p style="margin: 0; color: #71717a; font-size: 14px;">
                          <strong>Próximos passos:</strong><br>
                          1. Configure suas seeds de email para começar a capturar newsletters<br>
                          2. Adicione aliases para rastrear diferentes remetentes<br>
                          3. Explore o dashboard e configure seus alertas
                        </p>
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; border-top: 1px solid #e4e4e7; text-align: center;">
                      <p style="margin: 0 0 10px; color: #a1a1aa; font-size: 14px;">
                        Precisa de ajuda? Entre em contato conosco.
                      </p>
                      <p style="margin: 0; color: #a1a1aa; font-size: 12px;">
                        © 2024 Newsletter Tracker. Todos os direitos reservados.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    // Log the email send in the database
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    await supabaseAdmin.from("saas_payments").update({
      metadata: { welcome_email_sent: true, sent_at: new Date().toISOString() }
    }).eq("user_id", userId).order("created_at", { ascending: false }).limit(1);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-welcome-email function:", error);
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
