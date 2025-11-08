import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Cleaning up abandoned battles...");

    // Find battles that have been waiting for more than 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    const { data: expiredBattles, error } = await supabase
      .from("case_battles")
      .select("id")
      .eq("status", "waiting")
      .lt("created_at", tenMinutesAgo);

    if (error) {
      console.error("Error fetching expired battles:", error);
      throw error;
    }

    if (!expiredBattles || expiredBattles.length === 0) {
      console.log("No expired battles found");
      return new Response(
        JSON.stringify({ message: "No expired battles", cleaned: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${expiredBattles.length} expired battles`);

    // Update status to expired
    const { error: updateError } = await supabase
      .from("case_battles")
      .update({ status: "expired" })
      .in("id", expiredBattles.map(b => b.id));

    if (updateError) {
      console.error("Error updating expired battles:", updateError);
      throw updateError;
    }

    console.log(`Marked ${expiredBattles.length} battles as expired`);

    return new Response(
      JSON.stringify({ 
        message: "Cleanup complete", 
        cleaned: expiredBattles.length 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Cleanup error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
