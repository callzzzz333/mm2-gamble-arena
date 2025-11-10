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

    const { gameId, crashPoint } = await req.json();

    // Get game and bets
    const { data: game } = await supabase
      .from('crash_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game || game.status !== 'flying') {
      return new Response(JSON.stringify({ error: 'Invalid game' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update game to crashed
    await supabase
      .from('crash_games')
      .update({
        status: 'crashed',
        crash_point: crashPoint,
        crashed_at: new Date().toISOString(),
      })
      .eq('id', gameId);

    // Get all bets for this game
    const { data: bets } = await supabase
      .from('crash_bets')
      .select('*')
      .eq('game_id', gameId);

    // Process each bet
    for (const bet of bets || []) {
      const won = bet.cashed_out && bet.cashout_at && bet.cashout_at <= crashPoint;
      const payoutAmount = won ? Number(bet.bet_amount) * bet.cashout_at : 0;

      // Update bet
      await supabase
        .from('crash_bets')
        .update({
          won,
          payout_amount: payoutAmount,
        })
        .eq('id', bet.id);

      // If won, add items back to inventory
      if (won && bet.items) {
        const items = bet.items as any[];
        const multiplier = bet.cashout_at;
        
        for (const item of items) {
          const totalQuantity = Math.floor(item.quantity * multiplier);
          
          const { data: existingItem } = await supabase
            .from('user_items')
            .select('*')
            .eq('user_id', bet.user_id)
            .eq('item_id', item.item_id)
            .maybeSingle();

          if (existingItem) {
            await supabase
              .from('user_items')
              .update({ quantity: existingItem.quantity + totalQuantity })
              .eq('id', existingItem.id);
          } else {
            await supabase.from('user_items').insert({
              user_id: bet.user_id,
              item_id: item.item_id,
              quantity: totalQuantity,
            });
          }
        }
      }

      // Record transaction
      await supabase.from('transactions').insert({
        user_id: bet.user_id,
        amount: won ? payoutAmount : -Number(bet.bet_amount),
        type: won ? 'win' : 'loss',
        game_type: 'crash',
        game_id: gameId,
        description: `Crash ${won ? 'win' : 'loss'} @ ${crashPoint.toFixed(2)}x`,
      });
    }

    return new Response(JSON.stringify({ success: true, crashPoint }), {
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
