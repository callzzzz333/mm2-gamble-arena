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

    // Get all expired giveaways
    const { data: expiredGiveaways, error: giveawaysError } = await supabase
      .from("giveaways")
      .select("*")
      .eq("status", "active")
      .lt("ends_at", new Date().toISOString());

    if (giveawaysError) throw giveawaysError;

    const results = [];

    for (const giveaway of expiredGiveaways || []) {
      // Get all entries
      const { data: entries, error: entriesError } = await supabase
        .from("giveaway_entries")
        .select("user_id")
        .eq("giveaway_id", giveaway.id);

      if (entriesError) {
        console.error("Error fetching entries:", entriesError);
        continue;
      }

      if (!entries || entries.length === 0) {
        // No entries, mark as completed without winner
        await supabase
          .from("giveaways")
          .update({ status: "completed" })
          .eq("id", giveaway.id);
        
        results.push({ giveawayId: giveaway.id, winner: null, entries: 0 });
        continue;
      }

      // Pick random winner
      const randomIndex = Math.floor(Math.random() * entries.length);
      const winnerId = entries[randomIndex].user_id;

      // Update giveaway with winner
      await supabase
        .from("giveaways")
        .update({ 
          status: "completed",
          winner_id: winnerId 
        })
        .eq("id", giveaway.id);

      // Give items to winner
      const prizeItems = giveaway.prize_items as any[];
      for (const item of prizeItems) {
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
          await supabase
            .from("user_items")
            .insert({
              user_id: winnerId,
              item_id: item.item_id,
              quantity: item.quantity,
            });
        }
      }

      // Get winner's username
      const { data: winnerProfile } = await supabase
        .from("profiles")
        .select("username, roblox_username")
        .eq("id", winnerId)
        .single();

      const winnerName = winnerProfile?.roblox_username || winnerProfile?.username || "Unknown";

      // Announce winner in chat
      await supabase
        .from("chat_messages")
        .insert({
          user_id: winnerId,
          username: "🎁 GIVEAWAY",
          message: `🎉 ${winnerName} won the ${giveaway.title}! (${entries.length} entries)`,
        });

      results.push({ 
        giveawayId: giveaway.id, 
        winnerId, 
        entries: entries.length,
        title: giveaway.title 
      });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error completing giveaways:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
