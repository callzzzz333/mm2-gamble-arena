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
      return new Response(JSON.stringify({ error: fetchError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!expiredGiveaways || expiredGiveaways.length === 0) {
      console.log("No expired giveaways found");
      return new Response(JSON.stringify({ message: "No expired giveaways", processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    console.log(`Found ${expiredGiveaways.length} expired giveaway(s)`);
    let processedCount = 0;

    // Process each expired giveaway
    for (const giveaway of expiredGiveaways) {
      try {
        console.log(`Processing giveaway ${giveaway.id}`);

        // Get all entries
        const { data: entries, error: entriesError } = await supabase
          .from("giveaway_entries")
          .select("user_id")
          .eq("giveaway_id", giveaway.id);

        if (entriesError) {
          console.error(`Error fetching entries for ${giveaway.id}:`, entriesError);
          continue;
        }

        // No entries - return items to creator
        if (!entries || entries.length === 0) {
          console.log(`No entries for ${giveaway.id}, returning items to creator`);
          
          if (giveaway.prize_items && Array.isArray(giveaway.prize_items)) {
            for (const item of giveaway.prize_items) {
              const { data: existingItem } = await supabase
                .from("user_items")
                .select("*")
                .eq("user_id", giveaway.creator_id)
                .eq("item_id", item.item_id)
                .maybeSingle();

              if (existingItem) {
                await supabase
                  .from("user_items")
                  .update({ quantity: existingItem.quantity + item.quantity })
                  .eq("user_id", giveaway.creator_id)
                  .eq("item_id", item.item_id);
              } else {
                await supabase.from("user_items").insert({
                  user_id: giveaway.creator_id,
                  item_id: item.item_id,
                  quantity: item.quantity,
                });
              }
            }
          }

          // Delete giveaway with no entries
          await supabase.from("giveaways").delete().eq("id", giveaway.id);
          processedCount++;
          continue;
        }

        // Select random winner
        const randomIndex = Math.floor(Math.random() * entries.length);
        const winnerId = entries[randomIndex].user_id;
        console.log(`Winner selected: ${winnerId}`);

        // Update to drawing status
        await supabase
          .from("giveaways")
          .update({ status: "drawing", winner_id: winnerId })
          .eq("id", giveaway.id);

        // Wait for animation
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Award items
        if (giveaway.prize_items && Array.isArray(giveaway.prize_items)) {
          for (const item of giveaway.prize_items) {
            const { data: existingItem } = await supabase
              .from("user_items")
              .select("*")
              .eq("user_id", winnerId)
              .eq("item_id", item.item_id)
              .maybeSingle();

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

        // Post chat message
        const { data: winnerProfile } = await supabase
          .from("profiles")
          .select("username, roblox_username")
          .eq("id", winnerId)
          .maybeSingle();

        await supabase.from("chat_messages").insert({
          user_id: winnerId,
          username: winnerProfile?.roblox_username || winnerProfile?.username || "Unknown",
          message: `🎉 Won the giveaway! Prizes: ${giveaway.prize_items.map((i: any) => i.name).join(", ")}`,
        });

        // Update Discord
        try {
          const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
          if (webhookUrl && giveaway.discord_message_id) {
            const { data: creatorProfile } = await supabase
              .from("profiles")
              .select("roblox_username, username")
              .eq("id", giveaway.creator_id)
              .maybeSingle();

            const webhookParts = webhookUrl.split("/");
            const webhookId = webhookParts[webhookParts.length - 2];
            const webhookToken = webhookParts[webhookParts.length - 1];
            const updateUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${giveaway.discord_message_id}`;

            await fetch(updateUrl, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                embeds: [{
                  title: "🎉 Giveaway Completed",
                  description: `**${creatorProfile?.roblox_username || creatorProfile?.username || "Unknown"}**'s giveaway has ended!`,
                  color: 0x00ff00,
                  fields: [
                    { name: "Winner", value: `🏆 **${winnerProfile?.roblox_username || winnerProfile?.username || "Unknown"}**`, inline: false },
                    { name: "Total Value", value: `$${giveaway.total_value}`, inline: true },
                    { name: "Total Entries", value: `${entries.length}`, inline: true },
                  ],
                }],
              }),
            });
          }
        } catch (e) {
          console.error("Discord update error:", e);
        }

        // Wait then delete
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await supabase.from("giveaway_entries").delete().eq("giveaway_id", giveaway.id);
        await supabase.from("giveaways").delete().eq("id", giveaway.id);
        
        processedCount++;
        console.log(`Completed and deleted giveaway ${giveaway.id}`);
      } catch (error) {
        console.error(`Error processing giveaway ${giveaway.id}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in auto-complete:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
