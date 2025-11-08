import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NextRoundRequest {
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

    const { battleId } = (await req.json()) as NextRoundRequest;

    console.log("Processing next round for battle:", battleId);

    // Get battle details
    const { data: battle, error: battleError } = await supabase
      .from("case_battles")
      .select("*")
      .eq("id", battleId)
      .single();

    if (battleError || !battle) {
      throw new Error("Battle not found");
    }

    const nextRound = battle.current_round + 1;

    // Check if all rounds are complete
    if (nextRound > battle.rounds) {
      // Determine winner
      const { data: participants } = await supabase
        .from("case_battle_participants")
        .select("*")
        .eq("battle_id", battleId)
        .order("total_value", { ascending: false })
        .limit(1);

      const winner = participants?.[0];

      await supabase
        .from("case_battles")
        .update({
          status: "completed",
          winner_id: winner?.user_id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", battleId);

      return new Response(
        JSON.stringify({
          success: true,
          completed: true,
          winner_id: winner?.user_id,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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

    // Get all items
    const { data: items, error: itemsError } = await supabase
      .from("items")
      .select("*");

    if (itemsError || !items || items.length === 0) {
      throw new Error("No items available");
    }

    const cases = Array.isArray(battle.cases) ? battle.cases : [];
    const roundResults = [];

    // For each case, give each player a random item
    for (let caseIndex = 0; caseIndex < cases.length; caseIndex++) {
      for (const participant of participants) {
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
        const currentItemsWon = Array.isArray(participant.items_won) 
          ? participant.items_won 
          : [];

        await supabase
          .from("case_battle_participants")
          .update({
            total_value: participant.total_value + randomItem.value,
            items_won: [...currentItemsWon, randomItem],
          })
          .eq("id", participant.id);
      }
    }

    // Create round record
    await supabase.from("case_battle_rounds").insert({
      battle_id: battleId,
      round_number: nextRound,
      case_index: 0,
      results: roundResults,
    });

    // Update battle's current round
    await supabase
      .from("case_battles")
      .update({
        current_round: nextRound,
      })
      .eq("id", battleId);

    return new Response(
      JSON.stringify({
        success: true,
        round: nextRound,
        results: roundResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error processing next round:", error);
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
  const rarityWeights: Record<string, number> = {
    common: 40,
    rare: 25,
    vintage: 15,
    legendary: 10,
    ancient: 6,
    godly: 3,
    chroma: 1,
  };

  const weightedItems: any[] = [];
  items.forEach((item) => {
    const weight = rarityWeights[item.rarity.toLowerCase()] || 10;
    for (let i = 0; i < weight; i++) {
      weightedItems.push(item);
    }
  });

  return weightedItems[Math.floor(Math.random() * weightedItems.length)];
}
