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

    // Send Discord webhook notification
    try {
      const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
      if (webhookUrl) {
        const timestamp = Math.floor(endsAt.getTime() / 1000);

        // Get creator profile for username
        const { data: profile } = await supabase
          .from("profiles")
          .select("roblox_username, username")
          .eq("id", user.id)
          .single();

        const creatorName = profile?.roblox_username || profile?.username || "Unknown";

        // Build items description
        const itemsList = items.slice(0, 10).map((item: any) => 
          `• **${item.name}** (x${item.quantity}) - ${item.rarity} - $${item.value}`
        ).join("\n");

        const moreItems = items.length > 10 ? `\n*... and ${items.length - 10} more items*` : "";

        const embed = {
          title: "New Giveaway Created",
          description: `**${creatorName}** is giving away **${items.length}** item(s)\n\n**Prize Items:**\n${itemsList}${moreItems}`,
          color: 0x000000, // Black color
          fields: [
            {
              name: "Total Value",
              value: `$${totalValue.toFixed(2)}`,
              inline: true,
            },
            {
              name: "Ends",
              value: `<t:${timestamp}:R>`,
              inline: true,
            },
            {
              name: "Entries",
              value: "0",
              inline: true,
            },
          ],
          thumbnail: {
            url: items[0]?.image_url || "",
          },
          footer: {
            text: "Join the giveaway now on MM2PVP",
          },
          timestamp: new Date().toISOString(),
        };

        const webhookResponse = await fetch(webhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });

        if (!webhookResponse.ok) {
          console.error("Discord webhook failed:", await webhookResponse.text());
        } else {
          console.log("Discord webhook sent successfully");
          
          // Store the Discord message ID for future updates
          const webhookData = await webhookResponse.json();
          if (webhookData.id) {
            await supabase
              .from("giveaways")
              .update({ discord_message_id: webhookData.id })
              .eq("id", giveaway.id);
          }
        }
      }
    } catch (webhookError) {
      console.error("Error sending Discord webhook:", webhookError);
      // Don't fail the giveaway creation if webhook fails
    }

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
