import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { gameId } = await req.json();

    // Get game and bets
    const { data: game } = await supabase
      .from('roulette_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game || game.status !== 'waiting') {
      return new Response(JSON.stringify({ error: 'Invalid game' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Generate result (0 = green, 1-14 alternating red/black)
    const spinResult = Math.floor(Math.random() * 15);
    let spinColor: string;
    
    if (spinResult === 0) {
      spinColor = 'green';
    } else {
      spinColor = spinResult % 2 === 1 ? 'red' : 'black';
    }

    // Update game
    await supabase
      .from('roulette_games')
      .update({
        status: 'completed',
        spin_result: spinResult,
        spin_color: spinColor,
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    // Get all bets for this game
    const { data: bets } = await supabase
      .from('roulette_bets')
      .select('*')
      .eq('game_id', gameId);

    // Process each bet
    for (const bet of bets || []) {
      const won = bet.bet_color === spinColor;
      const multiplier = spinColor === 'green' ? 14 : 2;
      const payoutAmount = won ? Number(bet.bet_amount) * multiplier : 0;

      // Update bet
      await supabase
        .from('roulette_bets')
        .update({
          won,
          payout_amount: payoutAmount,
        })
        .eq('id', bet.id);

      // If won, add items back to inventory
      if (won && bet.items) {
        const items = bet.items as any[];
        for (const item of items) {
          for (let i = 0; i < multiplier; i++) {
            const { data: existingItem } = await supabase
              .from('user_items')
              .select('*')
              .eq('user_id', bet.user_id)
              .eq('item_id', item.item_id)
              .maybeSingle();

            if (existingItem) {
              await supabase
                .from('user_items')
                .update({ quantity: existingItem.quantity + item.quantity })
                .eq('id', existingItem.id);
            } else {
              await supabase.from('user_items').insert({
                user_id: bet.user_id,
                item_id: item.item_id,
                quantity: item.quantity,
              });
            }
          }
        }
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: bet.user_id,
        amount: won ? payoutAmount : -Number(bet.bet_amount),
        type: won ? 'win' : 'loss',
        game_type: 'roulette',
        game_id: gameId,
        description: `Roulette ${won ? 'win' : 'loss'} (${spinColor})`,
      });
    }

    return new Response(JSON.stringify({ success: true, result: spinColor, number: spinResult }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
