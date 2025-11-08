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

    // Get random items from the items table
    const { data: allItems, error: itemsError } = await supabase
      .from("items")
      .select("*")
      .limit(100);

    if (itemsError || !allItems || allItems.length === 0) {
      throw new Error("No items available");
    }

    // Pick 1-3 random items
    const numItems = Math.floor(Math.random() * 3) + 1;
    const selectedItems = [];
    const usedIndices = new Set();

    for (let i = 0; i < numItems; i++) {
      let randomIndex;
      do {
        randomIndex = Math.floor(Math.random() * allItems.length);
      } while (usedIndices.has(randomIndex));
      
      usedIndices.add(randomIndex);
      const item = allItems[randomIndex];
      
      selectedItems.push({
        item_id: item.id,
        name: item.name,
        value: item.value,
        quantity: 1,
        image_url: item.image_url,
        rarity: item.rarity,
      });
    }

    const totalValue = selectedItems.reduce((sum, item) => sum + item.value, 0);

    // Create auto giveaway that lasts 30 minutes
    const endsAt = new Date(Date.now() + 30 * 60 * 1000);
    
    const { data: giveaway, error: giveawayError } = await supabase
      .from("giveaways")
      .insert({
        creator_id: null,
        title: "🎁 Auto Giveaway",
        description: "Free giveaway! Join now for a chance to win!",
        prize_items: selectedItems,
        total_value: totalValue,
        type: "auto",
        status: "active",
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (giveawayError) throw giveawayError;

    console.log("Auto giveaway created:", giveaway.id);

    return new Response(JSON.stringify({ success: true, giveaway }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating auto giveaway:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
