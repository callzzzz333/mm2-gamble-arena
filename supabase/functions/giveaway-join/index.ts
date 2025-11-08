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

    const { giveawayId } = await req.json();

    if (!giveawayId) {
      throw new Error("Giveaway ID is required");
    }

      const { data: giveaway, error: giveawayError } = await supabase
        .from("giveaways")
        .select("*")
        .eq("id", giveawayId)
        .maybeSingle();

    if (giveawayError || !giveaway) {
      throw new Error("Giveaway not found");
    }

    // Prevent creator from joining their own giveaway
    if (giveaway.creator_id === user.id) {
      throw new Error("You cannot join your own giveaway");
    }

    if (giveaway.status !== "active") {
      throw new Error("Giveaway is not active");
    }

    if (new Date(giveaway.ends_at) < new Date()) {
      throw new Error("Giveaway has ended");
    }

    // Check if user already entered (prevents duplicates)
    const { data: existingEntry } = await supabase
      .from("giveaway_entries")
      .select("*")
      .eq("giveaway_id", giveawayId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingEntry) {
      console.log(`User ${user.id} already entered giveaway ${giveawayId}`);
      return new Response(JSON.stringify({ success: true, alreadyEntered: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create entry
    const { error: entryError } = await supabase
      .from("giveaway_entries")
      .insert({
        giveaway_id: giveawayId,
        user_id: user.id,
      });

    if (entryError) throw entryError;

    // Update Discord webhook with new entry count
    try {
      const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
      
      if (webhookUrl && giveaway.discord_message_id) {
        // Get updated entry count
        const { count: newEntryCount } = await supabase
          .from("giveaway_entries")
          .select("*", { count: "exact", head: true })
          .eq("giveaway_id", giveawayId);

        // Get creator profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("roblox_username, username")
          .eq("id", giveaway.creator_id)
          .maybeSingle();

        const creatorName = profile?.roblox_username || profile?.username || "Unknown";
        const items = giveaway.prize_items || [];
        const endsAt = new Date(giveaway.ends_at);
        const timestamp = Math.floor(endsAt.getTime() / 1000);

        // Build items description
        const itemsList = items.slice(0, 10).map((item: any) => 
          `• **${item.name}** (x${item.quantity}) - ${item.rarity} - $${item.value}`
        ).join("\n");

        const moreItems = items.length > 10 ? `\n*... and ${items.length - 10} more items*` : "";

        const embed = {
          title: "New Giveaway Created",
          description: `**${creatorName}** is giving away **${items.length}** item(s)\n\n**Prize Items:**\n${itemsList}${moreItems}`,
          color: 0x000000,
          fields: [
            {
              name: "Total Value",
              value: `$${giveaway.total_value}`,
              inline: true,
            },
            {
              name: "Ends",
              value: `<t:${timestamp}:R>`,
              inline: true,
            },
            {
              name: "Entries",
              value: `${newEntryCount || 0}`,
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

        // Extract webhook ID and token from URL
        const webhookParts = webhookUrl.split("/");
        const webhookId = webhookParts[webhookParts.length - 2];
        const webhookToken = webhookParts[webhookParts.length - 1];

        const updateUrl = `https://discord.com/api/webhooks/${webhookId}/${webhookToken}/messages/${giveaway.discord_message_id}`;
        
        const updateResponse = await fetch(updateUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ embeds: [embed] }),
        });

        if (!updateResponse.ok) {
          console.error("Discord webhook update failed:", await updateResponse.text());
        } else {
          console.log("Discord webhook updated successfully");
        }
      }
    } catch (webhookError) {
      console.error("Error updating Discord webhook:", webhookError);
      // Don't fail the entry if webhook update fails
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error joining giveaway:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
