import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface BattleStartRequest {
  battleId: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { battleId } = (await req.json()) as BattleStartRequest;

    console.log("Starting battle:", battleId);

    // Get battle details
    const { data: battle, error: battleError } = await supabase
      .from("case_battles")
      .select("*")
      .eq("id", battleId)
      .single();

    if (battleError || !battle) {
      throw new Error("Battle not found");
    }

    // Get all participants
    const { data: participants, error: participantsError } = await supabase
      .from("case_battle_participants")
      .select("*")
      .eq("battle_id", battleId)
      .order("position", { ascending: true });

    if (participantsError || !participants) {
      throw new Error("Failed to fetch participants");
    }

    // Check if battle has enough players
    if (participants.length !== battle.max_players) {
      throw new Error("Battle does not have enough players");
    }

    // Get all items for random selection
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("*");

    if (itemsError || !items || items.length === 0) {
      throw new Error("No items available");
    }

    // Process first round
    console.log("Processing round 1 of", battle.rounds);
    
    const cases = Array.isArray(battle.cases) ? battle.cases : [];
    const roundResults = [];

    // For each case in the battle, give each player a random item
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
      for (const participant of participants) {
        // Weighted random selection based on rarity
        const randomItem = getWeightedRandomItem(items);
        
        roundResults.push({
          user_id: participant.user_id,
          item_id: randomItem.id,
          value: randomItem.value,
          name: randomItem.name,
          rarity: randomItem.rarity,
          image_url: randomItem.image_url,
        });

        // Update participant's total value
        await supabase
          .from("case_battle_participants")
          .update({
            total_value: participant.total_value + randomItem.value,
            items_won: [...(participant.items_won || []), randomItem],
          })
          .eq("id", participant.id);
      }
    }

    // Create round record
    await supabase.from("case_battle_rounds").insert({
      battle_id: battleId,
      round_number: 1,
      case_index: 0,
      results: roundResults,
    });

    // Update battle status
    await supabase
      .from("case_battles")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        current_round: 1,
      })
      .eq("id", battleId);

    return new Response(
      JSON.stringify({
        success: true,
        results: roundResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error starting battle:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

function getWeightedRandomItem(items: any[]) {
  // Define rarity weights (higher = more common)
  const rarityWeights: Record<string, number> = {
    common: 40,
    rare: 25,
    vintage: 15,
    legendary: 10,
    ancient: 6,
    godly: 3,
    chroma: 1,
  };

  // Create weighted array
  const weightedItems: any[] = [];
  items.forEach((item) => {
    const weight = rarityWeights[item.rarity.toLowerCase()] || 10;
    for (let i = 0; i < weight; i++) {
      weightedItems.push(item);
    }
  });

  // Select random item from weighted array
  return weightedItems[Math.floor(Math.random() * weightedItems.length)];
}
