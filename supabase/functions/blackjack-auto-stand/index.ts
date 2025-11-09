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

    const { playerId, tableId } = await req.json();

    console.log('Auto-stand for player:', playerId, 'Table:', tableId);

    // Check if player is still in playing state
    const { data: player } = await supabase
      .from('blackjack_players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (!player || player.status !== 'playing') {
      console.log('Player not in playing state, skipping auto-stand');
      return new Response(
        JSON.stringify({ success: false, reason: 'player_not_playing' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update player status to standing
    const { error: updateError } = await supabase
      .from('blackjack_players')
      .update({ status: 'standing' })
      .eq('id', playerId);

    if (updateError) {
      throw updateError;
    }

    console.log('Auto-stand successful');

    // Check if all players are done
    const { data: players } = await supabase
      .from('blackjack_players')
      .select('*')
      .eq('table_id', tableId);

    const allDone = players?.every((p: any) => p.status === 'bust' || p.status === 'standing');

    if (allDone) {
      console.log('All players done, triggering dealer turn');
      // Trigger dealer turn
      await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/blackjack-dealer-turn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
        },
        body: JSON.stringify({ tableId }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in blackjack-auto-stand:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
