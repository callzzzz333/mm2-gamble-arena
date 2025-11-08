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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    const { giveawayId } = await req.json();

    if (!giveawayId) {
      throw new Error("Giveaway ID is required");
    }

    // Check if giveaway exists and is active
    const { data: giveaway, error: giveawayError } = await supabase
      .from("giveaways")
      .select("*")
      .eq("id", giveawayId)
      .single();

    if (giveawayError || !giveaway) {
      throw new Error("Giveaway not found");
    }

    if (giveaway.status !== "active") {
      throw new Error("Giveaway is not active");
    }

    if (new Date(giveaway.ends_at) < new Date()) {
      throw new Error("Giveaway has ended");
    }

    // Check if user already entered
    const { data: existingEntry } = await supabase
      .from("giveaway_entries")
      .select("*")
      .eq("giveaway_id", giveawayId)
      .eq("user_id", user.id)
      .single();

    if (existingEntry) {
      throw new Error("You have already entered this giveaway");
    }

    // Create entry
    const { error: entryError } = await supabase
      .from("giveaway_entries")
      .insert({
        giveaway_id: giveawayId,
        user_id: user.id,
      });

    if (entryError) throw entryError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error joining giveaway:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
