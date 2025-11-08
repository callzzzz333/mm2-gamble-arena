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

    console.log("Checking for expired giveaways...");

    // Find all active giveaways that have expired
    const { data: expiredGiveaways, error: fetchError } = await supabase
      .from("giveaways")
      .select("*")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (fetchError) {
      console.error("Error fetching expired giveaways:", fetchError);
      throw fetchError;
    }

    if (!expiredGiveaways || expiredGiveaways.length === 0) {
      console.log("No expired giveaways found");
      return new Response(JSON.stringify({ message: "No expired giveaways" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${expiredGiveaways.length} expired giveaway(s), completing them...`);

    // Complete each expired giveaway
    for (const giveaway of expiredGiveaways) {
      try {
        // Call the giveaway-complete function for each expired giveaway
        const { error: completeError } = await supabase.functions.invoke(
          "giveaway-complete",
          {
            body: { giveawayId: giveaway.id },
          }
        );

        if (completeError) {
          console.error(`Error completing giveaway ${giveaway.id}:`, completeError);
        } else {
          console.log(`Successfully completed giveaway ${giveaway.id}`);
        }
      } catch (error) {
        console.error(`Exception completing giveaway ${giveaway.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        completed: expiredGiveaways.length 
      }), 
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in auto-complete:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
