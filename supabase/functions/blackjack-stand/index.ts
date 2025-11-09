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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { tableId } = await req.json();

    console.log('Blackjack stand - User:', user.id, 'Table:', tableId);

    // Update player status to standing
    const { error: updateError } = await supabase
      .from('blackjack_players')
      .update({ status: 'standing' })
      .eq('table_id', tableId)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

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
    console.error('Error in blackjack-stand:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
