import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { reportId } = await req.json();

    if (!reportId) {
      throw new Error("reportId is required");
    }

    console.log(`Generating report: ${reportId}`);

    // Get report details
    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (reportError || !report) {
      throw new Error(`Report not found: ${reportError?.message}`);
    }

    // Update status to processing
    await supabase
      .from("reports")
      .update({ status: "processing" })
      .eq("id", reportId);

    console.log(`Processing report for period: ${report.period_start} to ${report.period_end}`);

    // Fetch newsletters data for the period
    const { data: newsletters, error: newslettersError } = await supabase
      .from("captured_newsletters")
      .select("*")
      .eq("seed_id", report.user_id)
      .gte("received_at", report.period_start)
      .lte("received_at", report.period_end);

    // Calculate metrics
    const totalEmails = newsletters?.length || 0;
    
    // Category breakdown
    const categoryBreakdown: Record<string, number> = {};
    newsletters?.forEach(n => {
      const cat = n.category || "uncategorized";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
    });

    // Sender breakdown
    const senderBreakdown: Record<string, number> = {};
    newsletters?.forEach(n => {
      senderBreakdown[n.from_email] = (senderBreakdown[n.from_email] || 0) + 1;
    });

    // Top senders
    const topSenders = Object.entries(senderBreakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([email, count]) => ({ email, count }));

    // Calculate email frequency by day
    const dailyFrequency: Record<string, number> = {};
    newsletters?.forEach(n => {
      const day = n.received_at.split("T")[0];
      dailyFrequency[day] = (dailyFrequency[day] || 0) + 1;
    });

    // Generate insights
    const insights = [];
    
    if (totalEmails > 0) {
      insights.push(`Foram capturados ${totalEmails} emails no período analisado.`);
      
      const topCategory = Object.entries(categoryBreakdown)
        .sort((a, b) => b[1] - a[1])[0];
      if (topCategory) {
        insights.push(`A categoria mais frequente foi "${topCategory[0]}" com ${topCategory[1]} emails.`);
      }

      if (topSenders.length > 0) {
        insights.push(`O remetente mais ativo foi ${topSenders[0].email} com ${topSenders[0].count} emails.`);
      }

      const avgPerDay = totalEmails / Object.keys(dailyFrequency).length || 0;
      insights.push(`Média de ${avgPerDay.toFixed(1)} emails por dia.`);
    } else {
      insights.push("Nenhum email foi capturado no período selecionado.");
    }

    // Build report content
    const contentJson = {
      generatedAt: new Date().toISOString(),
      period: {
        start: report.period_start,
        end: report.period_end,
      },
      summary: {
        totalEmails,
        uniqueSenders: Object.keys(senderBreakdown).length,
        categoriesDetected: Object.keys(categoryBreakdown).length,
      },
      categoryBreakdown,
      topSenders,
      dailyFrequency,
      insights,
    };

    console.log("Report content generated:", JSON.stringify(contentJson, null, 2));

    // Update report with content
    const { error: updateError } = await supabase
      .from("reports")
      .update({
        status: "completed",
        content_json: contentJson,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (updateError) {
      throw new Error(`Failed to update report: ${updateError.message}`);
    }

    // If send_email is true, send the report via email
    if (report.send_email) {
      // Get user email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", report.user_id)
        .single();

      console.log(`Report email would be sent to user ${report.user_id}`);
      // Email sending would be implemented here using Resend
    }

    console.log(`Report ${reportId} completed successfully`);

    return new Response(
      JSON.stringify({ success: true, reportId, content: contentJson }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating report:", error);

    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
