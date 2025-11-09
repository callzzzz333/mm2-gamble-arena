import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    console.log("Starting Christmas raffle draw for 2 winners...");

    // Get active raffle
    const { data: raffle, error: raffleError } = await supabaseAdmin
      .from("christmas_raffle")
      .select("*")
      .eq("year", 2025)
      .eq("status", "active")
      .single();

    if (raffleError || !raffle) {
      console.log("No active raffle found");
      return new Response(JSON.stringify({ error: "No active raffle found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Check if raffle end date has passed
    const now = new Date();
    const endDate = new Date(raffle.end_date);
    if (now < endDate) {
      console.log("Raffle has not ended yet");
      return new Response(JSON.stringify({ error: "Raffle has not ended yet" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Get all participants with their tickets
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from("christmas_raffle_tickets")
      .select("user_id, total_tickets");

    if (participantsError || !participants || participants.length === 0) {
      console.log("No participants found");
      return new Response(JSON.stringify({ error: "No participants found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (participants.length < 2) {
      console.log("Not enough participants (need at least 2)");
      return new Response(JSON.stringify({ error: "Need at least 2 participants" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create weighted array based on tickets
    const weightedParticipants: string[] = [];
    participants.forEach((p) => {
      for (let i = 0; i < p.total_tickets; i++) {
        weightedParticipants.push(p.user_id);
      }
    });

    // Draw first winner
    const randomIndex1 = Math.floor(Math.random() * weightedParticipants.length);
    const winner1Id = weightedParticipants[randomIndex1];

    // Remove first winner from pool for second draw
    const filteredParticipants = weightedParticipants.filter(id => id !== winner1Id);
    
    if (filteredParticipants.length === 0) {
      console.log("Only one unique participant, awarding full prize");
      // If only one participant, give them everything
      const winner1Amount = 500;
      
      await supabaseAdmin
        .from("christmas_raffle")
        .update({
          winner_id: winner1Id,
          winners: [{ user_id: winner1Id, amount: winner1Amount }],
          status: "completed",
          drawn_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", raffle.id);

      // Transfer all items to single winner
      await transferItems(supabaseAdmin, raffle.prize_items, winner1Id);

      return new Response(
        JSON.stringify({
          success: true,
          winners: [{ user_id: winner1Id, amount: winner1Amount }],
          message: "Single winner awarded full prize"
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Draw second winner
    const randomIndex2 = Math.floor(Math.random() * filteredParticipants.length);
    const winner2Id = filteredParticipants[randomIndex2];

    console.log("Winners drawn:", winner1Id, winner2Id);

    const winner1Amount = 250;
    const winner2Amount = 250;

    // Update raffle with winners
    await supabaseAdmin
      .from("christmas_raffle")
      .update({
        winner_id: winner1Id, // Keep for backward compatibility
        winners: [
          { user_id: winner1Id, amount: winner1Amount },
          { user_id: winner2Id, amount: winner2Amount }
        ],
        status: "completed",
        drawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", raffle.id);

    // Split prize items by value - each winner gets items worth approximately $250
    const prizeItems = raffle.prize_items as any[];
    
    // Sort items by value descending
    const sortedItems = [...prizeItems].sort((a, b) => 
      (Number(b.value) * b.quantity) - (Number(a.value) * a.quantity)
    );

    const winner1Items: any[] = [];
    const winner2Items: any[] = [];
    let winner1Total = 0;
    let winner2Total = 0;

    // Distribute items to try to get close to $250 each
    sortedItems.forEach(item => {
      const itemValue = Number(item.value) * item.quantity;
      
      if (winner1Total <= winner2Total && winner1Total + itemValue <= 250) {
        winner1Items.push(item);
        winner1Total += itemValue;
      } else if (winner2Total + itemValue <= 250) {
        winner2Items.push(item);
        winner2Total += itemValue;
      } else {
        // If both are over or near $250, give to whoever has less
        if (winner1Total <= winner2Total) {
          winner1Items.push(item);
          winner1Total += itemValue;
        } else {
          winner2Items.push(item);
          winner2Total += itemValue;
        }
      }
    });

    // Transfer items to winners
    await transferItems(supabaseAdmin, winner1Items, winner1Id);
    await transferItems(supabaseAdmin, winner2Items, winner2Id);

    // Send Discord notification
    const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL");
    if (webhookUrl) {
      const { data: winner1Profile } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("id", winner1Id)
        .maybeSingle();

      const { data: winner2Profile } = await supabaseAdmin
        .from("profiles")
        .select("username")
        .eq("id", winner2Id)
        .maybeSingle();

      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          embeds: [
            {
              title: "🎄 Christmas Raffle - 2 Winners! 🎄",
              description: `**Winner 1:** ${winner1Profile?.username || "Unknown"} - $${winner1Amount}\n**Winner 2:** ${winner2Profile?.username || "Unknown"} - $${winner2Amount}\n\nTotal Prize Pool: **$500.00**`,
              color: 0xff0000,
              fields: [
                {
                  name: "Total Tickets",
                  value: weightedParticipants.length.toString(),
                  inline: true,
                },
                {
                  name: "Total Participants",
                  value: participants.length.toString(),
                  inline: true,
                },
                {
                  name: "Prize Value",
                  value: "$500.00",
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    }

    console.log("Raffle completed successfully with 2 winners");

    return new Response(
      JSON.stringify({
        success: true,
        winners: [
          { user_id: winner1Id, amount: winner1Amount },
          { user_id: winner2Id, amount: winner2Amount }
        ],
        total_prize_value: 500,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error: any) {
    console.error("Error in christmas-raffle-draw:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});

// Helper function to transfer items to a winner
async function transferItems(supabaseAdmin: any, items: any[], winnerId: string) {
  const itemMap = new Map<string, number>();

  // Aggregate items by item_id
  items.forEach((item: any) => {
    const currentQty = itemMap.get(item.item_id) || 0;
    itemMap.set(item.item_id, currentQty + item.quantity);
  });

  // Add items to winner's inventory
  for (const [itemId, quantity] of itemMap.entries()) {
    const { data: existingItem } = await supabaseAdmin
      .from("user_items")
      .select("*")
      .eq("user_id", winnerId)
      .eq("item_id", itemId)
      .maybeSingle();

    if (existingItem) {
      await supabaseAdmin
        .from("user_items")
        .update({ quantity: existingItem.quantity + quantity })
        .eq("user_id", winnerId)
        .eq("item_id", itemId);
    } else {
      await supabaseAdmin.from("user_items").insert({
        user_id: winnerId,
        item_id: itemId,
        quantity: quantity,
      });
    }
  }
}
