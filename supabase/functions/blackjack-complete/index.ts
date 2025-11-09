import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { tableId, dealerScore } = await req.json();

    console.log('Completing blackjack game for table:', tableId, 'Dealer score:', dealerScore);

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('blackjack_players')
      .select('*')
      .eq('table_id', tableId);

    if (playersError || !players) {
      throw new Error('Players not found');
    }

    const dealerBust = dealerScore > 21;
    const winners: any[] = [];
    let highestScore = 0;

    // Determine winners
    for (const player of players) {
      let won: boolean | null = false;

      if (player.status !== 'bust') {
        if (dealerBust) {
          won = true;
        } else if (player.score > dealerScore) {
          won = true;
        } else if (player.score === dealerScore) {
          // Push - return bet to player
          won = null;
          const { data: profile } = await supabase
            .from('profiles')
            .select('balance')
            .eq('id', player.user_id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({ 
                balance: Number(profile.balance) + Number(player.bet_amount)
              })
              .eq('id', player.user_id);
          }
        }
      }

      // Track highest score for potential split
      if (won === true && player.score > highestScore) {
        highestScore = player.score;
      }

      await supabase
        .from('blackjack_players')
        .update({ won })
        .eq('id', player.id);

      if (won === true) {
        winners.push(player);
      }
    }

    console.log('Winners:', winners.length);

    // Calculate total pot
    const totalPot = players.reduce((sum, p) => sum + Number(p.bet_amount), 0);

    // Distribute winnings
    if (winners.length > 0) {
      // Filter winners to only those with highest score (in case of tie)
      const topWinners = winners.filter(w => w.score === highestScore);
      const winningsPerPlayer = totalPot / topWinners.length;

      console.log('Top winners:', topWinners.length, 'Winnings per player:', winningsPerPlayer);

      for (const winner of topWinners) {
        // Add winnings to user balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('balance')
          .eq('id', winner.user_id)
          .single();

        if (profile) {
          await supabase
            .from('profiles')
            .update({ 
              balance: Number(profile.balance) + winningsPerPlayer 
            })
            .eq('id', winner.user_id);

          // Record transaction
          await supabase
            .from('transactions')
            .insert({
              user_id: winner.user_id,
              amount: winningsPerPlayer,
              type: 'win',
              game_type: 'blackjack',
              game_id: tableId,
              description: `Blackjack win - ${topWinners.length > 1 ? 'Split pot' : 'Winner'}`,
            });
        }
      }
    }

    // Mark table as completed
    await supabase
      .from('blackjack_tables')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    console.log('Game completed successfully');

    return new Response(
      JSON.stringify({ success: true, winners: winners.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in blackjack-complete:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
