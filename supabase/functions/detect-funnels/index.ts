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

    const { userId } = await req.json();

    if (!userId) {
      throw new Error("userId is required");
    }

    console.log(`Detecting funnels for user: ${userId}`);

    // Get user's seeds
    const { data: seeds, error: seedsError } = await supabase
      .from("email_seeds")
      .select("id")
      .eq("user_id", userId);

    if (seedsError) throw seedsError;

    if (!seeds?.length) {
      return new Response(
        JSON.stringify({ success: true, funnelsCreated: 0, message: "No seeds found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const seedIds = seeds.map(s => s.id);

    // Get all newsletters from user's seeds
    const { data: newsletters, error: newslettersError } = await supabase
      .from("captured_newsletters")
      .select("id, from_email, from_name, subject, category, received_at, ctas")
      .in("seed_id", seedIds)
      .order("received_at", { ascending: true });

    if (newslettersError) throw newslettersError;

    console.log(`Found ${newsletters?.length || 0} newsletters`);

    // Group by sender
    const senderGroups: Record<string, typeof newsletters> = {};
    newsletters?.forEach(n => {
      if (!senderGroups[n.from_email]) {
        senderGroups[n.from_email] = [];
      }
      senderGroups[n.from_email].push(n);
    });

    // Get existing funnels
    const { data: existingFunnels } = await supabase
      .from("email_funnels")
      .select("sender_email")
      .eq("user_id", userId);

    const existingSenders = new Set(existingFunnels?.map(f => f.sender_email) || []);

    // Create funnels for senders with 3+ emails that don't have funnels yet
    const funnelsToCreate = [];
    const colors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4"];
    let colorIndex = 0;

    for (const [senderEmail, emails] of Object.entries(senderGroups)) {
      if (emails.length >= 3 && !existingSenders.has(senderEmail)) {
        const senderName = emails[0].from_name || senderEmail.split("@")[0];
        const emailIds = emails.map(e => e.id);
        
        // Calculate average interval
        let totalHours = 0;
        for (let i = 1; i < emails.length; i++) {
          const diff = new Date(emails[i].received_at).getTime() - new Date(emails[i - 1].received_at).getTime();
          totalHours += diff / (1000 * 60 * 60);
        }
        const avgInterval = Math.round(totalHours / (emails.length - 1));

        // Detect common categories
        const categoryCount: Record<string, number> = {};
        emails.forEach(e => {
          if (e.category) {
            categoryCount[e.category] = (categoryCount[e.category] || 0) + 1;
          }
        });
        const dominantCategory = Object.entries(categoryCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "newsletter";

        // Generate name based on category and sender
        const funnelName = `${dominantCategory.charAt(0).toUpperCase() + dominantCategory.slice(1)} - ${senderName}`;

        // Detect tags from subjects and CTAs
        const tags = new Set<string>();
        emails.forEach(e => {
          if (e.category) tags.add(e.category);
          // Extract potential tags from subject
          const subjectWords = e.subject.toLowerCase();
          if (subjectWords.includes("welcome") || subjectWords.includes("bem-vindo")) tags.add("welcome");
          if (subjectWords.includes("confirm") || subjectWords.includes("confirma")) tags.add("confirmation");
          if (subjectWords.includes("offer") || subjectWords.includes("oferta")) tags.add("promotion");
          if (subjectWords.includes("tip") || subjectWords.includes("dica")) tags.add("educational");
        });

        funnelsToCreate.push({
          user_id: userId,
          name: funnelName,
          sender_email: senderEmail,
          sender_name: senderName,
          email_ids: emailIds,
          color: colors[colorIndex % colors.length],
          tags: Array.from(tags).slice(0, 5),
          total_emails: emails.length,
          first_email_at: emails[0].received_at,
          last_email_at: emails[emails.length - 1].received_at,
          avg_interval_hours: avgInterval,
          is_active: true,
        });

        colorIndex++;
      }
    }

    console.log(`Creating ${funnelsToCreate.length} new funnels`);

    if (funnelsToCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("email_funnels")
        .insert(funnelsToCreate);

      if (insertError) {
        console.error("Error inserting funnels:", insertError);
        throw insertError;
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        funnelsCreated: funnelsToCreate.length,
        sendersAnalyzed: Object.keys(senderGroups).length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error detecting funnels:", error);

    return new Response(
      JSON.stringify({ error: error?.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
