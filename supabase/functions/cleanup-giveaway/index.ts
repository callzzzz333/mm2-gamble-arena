import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Delete completed giveaways that have been ended for more than 10 seconds
    const tenSecondsAgo = new Date(Date.now() - 10000).toISOString();
    
    const { data: oldGiveaways, error: fetchError } = await supabase
      .from("giveaways")
      .select("id")
      .eq("status", "completed")
      .lt("ended_at", tenSecondsAgo);

    if (fetchError) {
      console.error("Error fetching old giveaways:", fetchError);
      throw fetchError;
    }

    if (!oldGiveaways || oldGiveaways.length === 0) {
      console.log("No old giveaways to clean up");
      return new Response(JSON.stringify({ message: "No cleanup needed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const giveawayIds = oldGiveaways.map((g) => g.id);

    // Delete entries first
    const { error: entriesError } = await supabase
      .from("giveaway_entries")
      .delete()
      .in("giveaway_id", giveawayIds);

    if (entriesError) {
      console.error("Error deleting entries:", entriesError);
    }

    // Delete giveaways
    const { error: deleteError } = await supabase
      .from("giveaways")
      .delete()
      .in("id", giveawayIds);

    if (deleteError) {
      console.error("Error deleting giveaways:", deleteError);
      throw deleteError;
    }

    console.log(`Cleaned up ${giveawayIds.length} old giveaways`);

    return new Response(
      JSON.stringify({ success: true, cleaned: giveawayIds.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in cleanup-giveaway:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
