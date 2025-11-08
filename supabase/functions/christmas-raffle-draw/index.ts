import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting Christmas raffle draw...');

    // Get active raffle
    const { data: raffle, error: raffleError } = await supabaseAdmin
      .from('christmas_raffle')
      .select('*')
      .eq('year', 2024)
      .eq('status', 'active')
      .single();

    if (raffleError || !raffle) {
      console.log('No active raffle found');
      return new Response(
        JSON.stringify({ error: 'No active raffle found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // Check if raffle end date has passed
    const now = new Date();
    const endDate = new Date(raffle.end_date);
    if (now < endDate) {
      console.log('Raffle has not ended yet');
      return new Response(
        JSON.stringify({ error: 'Raffle has not ended yet' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Get all participants with their tickets
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('christmas_raffle_tickets')
      .select('user_id, total_tickets');

    if (participantsError || !participants || participants.length === 0) {
      console.log('No participants found');
      return new Response(
        JSON.stringify({ error: 'No participants found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Create weighted array based on tickets
    const weightedParticipants: string[] = [];
    participants.forEach(p => {
      for (let i = 0; i < p.total_tickets; i++) {
        weightedParticipants.push(p.user_id);
      }
    });

    // Draw random winner
    const randomIndex = Math.floor(Math.random() * weightedParticipants.length);
    const winnerId = weightedParticipants[randomIndex];

    console.log('Winner drawn:', winnerId);

    // Update raffle with winner
    await supabaseAdmin
      .from('christmas_raffle')
      .update({
        winner_id: winnerId,
        status: 'completed',
        drawn_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', raffle.id);

    // Transfer all prize items to winner
    const prizeItems = raffle.prize_items as any[];
    const itemMap = new Map<string, number>();

    // Aggregate items by item_id
    prizeItems.forEach((item: any) => {
      const currentQty = itemMap.get(item.item_id) || 0;
      itemMap.set(item.item_id, currentQty + item.quantity);
    });

    // Add items to winner's inventory
    for (const [itemId, quantity] of itemMap.entries()) {
      const { data: existingItem } = await supabaseAdmin
        .from('user_items')
        .select('*')
        .eq('user_id', winnerId)
        .eq('item_id', itemId)
        .maybeSingle();

      if (existingItem) {
        await supabaseAdmin
          .from('user_items')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('user_id', winnerId)
          .eq('item_id', itemId);
      } else {
        await supabaseAdmin
          .from('user_items')
          .insert({
            user_id: winnerId,
            item_id: itemId,
            quantity: quantity
          });
      }
    }

    // Send Discord notification
    const webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL');
    if (webhookUrl) {
      const { data: winnerProfile } = await supabaseAdmin
        .from('profiles')
        .select('username')
        .eq('id', winnerId)
        .single();

      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: '🎄 Christmas Raffle Winner! 🎁',
            description: `Congratulations to **${winnerProfile?.username || 'Unknown'}**!\n\nThey won the grand prize worth **$${raffle.total_prize_value.toFixed(2)}**!`,
            color: 0xFF0000,
            fields: [
              {
                name: '🎟️ Total Tickets',
                value: weightedParticipants.length.toString(),
                inline: true
              },
              {
                name: '👥 Total Participants',
                value: participants.length.toString(),
                inline: true
              },
              {
                name: '🎁 Prize Value',
                value: `$${raffle.total_prize_value.toFixed(2)}`,
                inline: true
              }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });
    }

    console.log('Raffle completed successfully');

    return new Response(
      JSON.stringify({
        success: true,
        winner_id: winnerId,
        total_prize_value: raffle.total_prize_value
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in christmas-raffle-draw:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
