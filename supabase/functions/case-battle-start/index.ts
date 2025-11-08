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

    const { battleId } = await req.json();
    console.log("Starting battle:", battleId);

    // Get battle details
    const { data: battle, error: battleError } = await supabase
      .from("case_battles")
      .select("*")
      .eq("id", battleId)
      .eq("status", "waiting")
      .maybeSingle();

    if (battleError || !battle) {
      console.error("Battle error:", battleError);
      throw new Error("Battle not found or already started");
    }

    // Get participants
    const { data: participants, error: pError } = await supabase
      .from("case_battle_participants")
      .select("*")
      .eq("battle_id", battleId)
      .order("position");

    if (pError || !participants || participants.length !== battle.max_players) {
      throw new Error(`Need ${battle.max_players} players`);
    }

    // Get items
    const { data: items } = await supabase.from("items").select("*");
    if (!items || items.length === 0) throw new Error("No items");

    const caseIds = Array.isArray(battle.cases) ? battle.cases : [];
    const roundResults = [];

    // Process first round - open all cases for each player
    for (const participant of participants) {
      for (let caseIndex = 0; caseIndex < caseIds.length; caseIndex++) {
        // Each case contains 8 random items
        for (let itemIndex = 0; itemIndex < 8; itemIndex++) {
          const item = getWeightedRandomItem(items);
          roundResults.push({
            user_id: participant.user_id,
            item_id: item.id,
            value: item.value,
            name: item.name,
            rarity: item.rarity,
            image_url: item.image_url,
          });
        }
      }
    }

    // Update participants
    for (const participant of participants) {
      const userResults = roundResults.filter(r => r.user_id === participant.user_id);
      const value = userResults.reduce((sum, r) => sum + r.value, 0);
      const items = Array.isArray(participant.items_won) ? participant.items_won : [];
      
      await supabase
        .from("case_battle_participants")
        .update({
          total_value: value,
          items_won: [...items, ...userResults],
        })
        .eq("id", participant.id);
    }

    // Create round
    await supabase.from("case_battle_rounds").insert({
      battle_id: battleId,
      round_number: 1,
      case_index: 0,
      results: roundResults,
    });

    // Update battle
    await supabase
      .from("case_battles")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        current_round: 1,
      })
      .eq("id", battleId);

    console.log("Battle started successfully");

    return new Response(
      JSON.stringify({ success: true, results: roundResults, round: 1 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Error", 
        success: false 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getWeightedRandomItem(items: any[]) {
  const weights: Record<string, number> = {
    common: 40, rare: 25, vintage: 15, legendary: 10,
    ancient: 6, godly: 3, chroma: 1,
  };
  const weighted: any[] = [];
  items.forEach((item) => {
    const w = weights[item.rarity.toLowerCase()] || 10;
    for (let i = 0; i < w; i++) weighted.push(item);
  });
  return weighted[Math.floor(Math.random() * weighted.length)];
}
