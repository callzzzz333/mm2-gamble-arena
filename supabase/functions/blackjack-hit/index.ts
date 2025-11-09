import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Card {
  suit: string;
  rank: string;
  value: number;
}

const suits = ['♠', '♥', '♦', '♣'];
const ranks = [
  { rank: 'A', value: 11 },
  { rank: '2', value: 2 },
  { rank: '3', value: 3 },
  { rank: '4', value: 4 },
  { rank: '5', value: 5 },
  { rank: '6', value: 6 },
  { rank: '7', value: 7 },
  { rank: '8', value: 8 },
  { rank: '9', value: 9 },
  { rank: '10', value: 10 },
  { rank: 'J', value: 10 },
  { rank: 'Q', value: 10 },
  { rank: 'K', value: 10 },
];

function dealCard(): Card {
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rankData = ranks[Math.floor(Math.random() * ranks.length)];
  return {
    suit,
    rank: rankData.rank,
    value: rankData.value,
  };
}

function calculateScore(hand: Card[]): number {
  let score = 0;
  let aces = 0;

  for (const card of hand) {
    score += card.value;
    if (card.rank === 'A') aces++;
  }

  // Adjust for aces
  while (score > 21 && aces > 0) {
    score -= 10;
    aces--;
  }

  return score;
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

    console.log('Blackjack hit - User:', user.id, 'Table:', tableId);

    // Get player
    const { data: player, error: playerError } = await supabase
      .from('blackjack_players')
      .select('*')
      .eq('table_id', tableId)
      .eq('user_id', user.id)
      .single();

    if (playerError || !player) {
      throw new Error('Player not found');
    }

    if (player.status !== 'playing') {
      throw new Error('Cannot hit - player not in playing state');
    }

    // Deal a card
    const newCard = dealCard();
    const newHand = [...player.hand, newCard];
    const newScore = calculateScore(newHand);
    
    console.log('Dealt card:', newCard, 'New score:', newScore);

    // Update player
    const newStatus = newScore > 21 ? 'bust' : 'playing';
    
    const { error: updateError } = await supabase
      .from('blackjack_players')
      .update({
        hand: newHand,
        score: newScore,
        status: newStatus,
      })
      .eq('id', player.id);

    if (updateError) {
      throw updateError;
    }

    // Move to next player or check if all done
    if (newStatus === 'bust') {
      await moveToNextPlayerOrComplete(supabase, tableId, player.id);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        card: newCard,
        score: newScore,
        status: newStatus 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in blackjack-hit:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});

async function moveToNextPlayerOrComplete(supabase: any, tableId: string, currentPlayerId: string) {
  // Get all players
  const { data: players } = await supabase
    .from('blackjack_players')
    .select('*')
    .eq('table_id', tableId)
    .order('joined_at', { ascending: true });

  const allDone = players?.every((p: any) => p.status === 'bust' || p.status === 'standing');

  if (allDone) {
    console.log('All players done, triggering dealer turn');
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/blackjack-dealer-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ tableId }),
    });
  } else {
    // Move to next player
    const currentIndex = players.findIndex((p: any) => p.id === currentPlayerId);
    let nextIndex = (currentIndex + 1) % players.length;
    
    // Find next player who is still playing
    while (players[nextIndex].status !== 'playing' && nextIndex !== currentIndex) {
      nextIndex = (nextIndex + 1) % players.length;
    }
    
    if (players[nextIndex].status === 'playing') {
      await supabase
        .from('blackjack_tables')
        .update({
          current_player_id: players[nextIndex].id,
          turn_started_at: new Date().toISOString(),
        })
        .eq('id', tableId);
    }
  }
}

async function checkAndCompleteTurn(supabase: any, tableId: string) {
  // Deprecated - use moveToNextPlayerOrComplete instead
  const { data: players } = await supabase
    .from('blackjack_players')
    .select('*')
    .eq('table_id', tableId);

  const allDone = players?.every((p: any) => p.status === 'bust' || p.status === 'standing');

  if (allDone) {
    console.log('All players done, triggering dealer turn');
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/blackjack-dealer-turn`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ tableId }),
    });
  }
}
