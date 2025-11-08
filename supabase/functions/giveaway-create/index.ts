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

    const { items, title, description, durationMinutes } = await req.json();

    if (!items || items.length === 0) {
      throw new Error("No items provided");
    }

    // Calculate total value
    const totalValue = items.reduce((sum: number, item: any) => sum + (item.value * item.quantity), 0);

    // Deduct items from user's inventory
    for (const item of items) {
      const { data: userItem, error: checkError } = await supabase
        .from("user_items")
        .select("*")
        .eq("user_id", user.id)
        .eq("item_id", item.item_id)
        .single();

      if (checkError || !userItem || userItem.quantity < item.quantity) {
        throw new Error(`Not enough ${item.name}`);
      }

      const { error: updateError } = await supabase
        .from("user_items")
        .update({ quantity: userItem.quantity - item.quantity })
        .eq("user_id", user.id)
        .eq("item_id", item.item_id);

      if (updateError) throw updateError;

      // Delete if quantity is 0
      if (userItem.quantity - item.quantity === 0) {
        await supabase
          .from("user_items")
          .delete()
          .eq("user_id", user.id)
          .eq("item_id", item.item_id);
      }
    }

    // Create giveaway
    const endsAt = new Date(Date.now() + (durationMinutes || 5) * 60 * 1000);
    
    const { data: giveaway, error: giveawayError } = await supabase
      .from("giveaways")
      .insert({
        creator_id: user.id,
        title: title || "Item Giveaway",
        description: description || null,
        prize_items: items,
        total_value: totalValue,
        type: "manual",
        status: "active",
        ends_at: endsAt.toISOString(),
      })
      .select()
      .single();

    if (giveawayError) throw giveawayError;

    return new Response(JSON.stringify({ success: true, giveaway }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error creating giveaway:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
