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
        .maybeSingle();

      // Post winner announcement to chat
      await supabase.from("chat_messages").insert({
        user_id: winnerId,
        username: winnerProfile?.roblox_username || winnerProfile?.username || "Unknown",
        message: `🎉 Won the giveaway! Prizes: ${giveaway.prize_items.map((i: any) => i.name).join(", ")}`,
      });

      // Update Discord webhook with winner
      try {
        const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
        
        if (webhookUrl && giveaway.discord_message_id) {
          const { data: creatorProfile } = await supabase
            .from("profiles")
            .select("roblox_username, username")
            .eq("id", giveaway.creator_id)
            .maybeSingle();

          const creatorName = creatorProfile?.roblox_username || creatorProfile?.username || "Unknown";
          const winnerName = winnerProfile?.roblox_username || winnerProfile?.username || "Unknown";
          const items = giveaway.prize_items || [];

          const itemsList = items.slice(0, 10).map((item: any) => 
            `• **${item.name}** (x${item.quantity}) - ${item.rarity} - $${item.value}`
          ).join("\n");

          const moreItems = items.length > 10 ? `\n*... and ${items.length - 10} more items*` : "";

          const embed = {
            title: "🎉 Giveaway Completed",
            description: `**${creatorName}**'s giveaway has ended!\n\n**Prize Items:**\n${itemsList}${moreItems}`,
            color: 0x00ff00, // Green color
            fields: [
              {
                name: "Winner",
                value: `🏆 **${winnerName}**`,
                inline: false,
              },
              {
                name: "Total Value",
                value: `$${giveaway.total_value}`,
                inline: true,
              },
              {
                name: "Total Entries",
                value: `${entries.length}`,
                inline: true,
              },
            ],
            thumbnail: {
              url: items[0]?.image_url || "",
            },
            footer: {
              text: "Congratulations to the winner!",
            },
            timestamp: new Date().toISOString(),
          };

          const webhookParts = webhookUrl.split("/");
          const webhookId = webhookParts[webhookParts.length - 2];
          const webhookToken = webhookParts[webhookParts.length - 1];

          const updateUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${giveaway.discord_message_id}`;
          
          await fetch(updateUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ embeds: [embed] }),
          });
        }
      } catch (webhookError) {
        console.error("Error updating Discord webhook with winner:", webhookError);
      }

      // Mark as completed
      await supabase
        .from("giveaways")
        .update({ status: "completed", ended_at: new Date().toISOString() })
        .eq("id", giveaway.id);

      console.log(`Giveaway ${giveaway.id} completed successfully`);

      // Wait 2 seconds then delete all entries and the giveaway
      await new Promise((resolve) => setTimeout(resolve, 2000));
      
      await supabase
        .from("giveaway_entries")
        .delete()
        .eq("giveaway_id", giveaway.id);
      
      await supabase
        .from("giveaways")
        .delete()
        .eq("id", giveaway.id);

      console.log(`Giveaway ${giveaway.id} deleted successfully`)
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
