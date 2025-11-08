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

    // Find expired giveaways that haven't been completed
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
      console.log("No expired giveaways to process");
      return new Response(JSON.stringify({ message: "No expired giveaways" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${expiredGiveaways.length} expired giveaways`);

    for (const giveaway of expiredGiveaways) {
      console.log(`Processing giveaway ${giveaway.id}`);

      // Get all entries for this giveaway
      const { data: entries, error: entriesError } = await supabase
        .from("giveaway_entries")
        .select("user_id")
        .eq("giveaway_id", giveaway.id);

      if (entriesError) {
        console.error(`Error fetching entries for giveaway ${giveaway.id}:`, entriesError);
        continue;
      }

      if (!entries || entries.length === 0) {
        console.log(`No entries for giveaway ${giveaway.id}, marking as completed without winner`);
        
        // Return items to creator if no one joined
        if (giveaway.prize_items && Array.isArray(giveaway.prize_items)) {
          for (const item of giveaway.prize_items) {
            // Check if user already has this item
            const { data: existingItem } = await supabase
              .from("user_items")
              .select("*")
              .eq("user_id", giveaway.creator_id)
              .eq("item_id", item.item_id)
              .single();

            if (existingItem) {
              await supabase
                .from("user_items")
                .update({ quantity: existingItem.quantity + item.quantity })
                .eq("user_id", giveaway.creator_id)
                .eq("item_id", item.item_id);
            } else {
              await supabase
                .from("user_items")
                .insert({
                  user_id: giveaway.creator_id,
                  item_id: item.item_id,
                  quantity: item.quantity,
                });
            }
          }
        }

        await supabase
          .from("giveaways")
          .update({ status: "completed", ended_at: new Date().toISOString() })
          .eq("id", giveaway.id);

        continue;
      }

      // Select random winner
      const randomIndex = Math.floor(Math.random() * entries.length);
      const winnerId = entries[randomIndex].user_id;

      console.log(`Selected winner ${winnerId} for giveaway ${giveaway.id}`);

      // Update giveaway status first to trigger UI animation
      const { error: updateError } = await supabase
        .from("giveaways")
        .update({
          status: "drawing",
          winner_id: winnerId,
        })
        .eq("id", giveaway.id);

      if (updateError) {
        console.error(`Error updating giveaway ${giveaway.id}:`, updateError);
        continue;
      }

      // Wait 5 seconds for the spinning animation to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Award items to winner
      if (giveaway.prize_items && Array.isArray(giveaway.prize_items)) {
        for (const item of giveaway.prize_items) {
          // Check if winner already has this item
          const { data: existingItem } = await supabase
            .from("user_items")
            .select("*")
            .eq("user_id", winnerId)
            .eq("item_id", item.item_id)
            .single();

          if (existingItem) {
            await supabase
              .from("user_items")
              .update({ quantity: existingItem.quantity + item.quantity })
              .eq("user_id", winnerId)
              .eq("item_id", item.item_id);
          } else {
            await supabase.from("user_items").insert({
              user_id: winnerId,
              item_id: item.item_id,
              quantity: item.quantity,
            });
          }
        }
      }

      // Get winner profile for chat announcement
      const { data: winnerProfile } = await supabase
        .from("profiles")
        .select("username, roblox_username")
        .eq("id", winnerId)
        .single();

      // Post winner announcement to chat
      await supabase.from("chat_messages").insert({
        user_id: winnerId,
        username: winnerProfile?.roblox_username || winnerProfile?.username || "Unknown",
        message: `🎉 Won the giveaway! Prizes: ${giveaway.prize_items.map((i: any) => i.name).join(", ")}`,
      });

      // Mark as completed
      await supabase
        .from("giveaways")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", giveaway.id);

      console.log(`Giveaway ${giveaway.id} completed successfully`);

      // Cleanup will happen on next cron run after status is 'completed'
    }

    return new Response(
      JSON.stringify({ success: true, processed: expiredGiveaways.length }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in giveaway-complete:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
