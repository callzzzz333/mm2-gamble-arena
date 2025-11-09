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

    const { tableId } = await req.json();

    console.log('Starting blackjack game for table:', tableId);

    // Get table
    const { data: table, error: tableError } = await supabase
      .from('blackjack_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      throw new Error('Table not found');
    }

    if (table.status !== 'waiting') {
      throw new Error('Game already started');
    }

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from('blackjack_players')
      .select('*')
      .eq('table_id', tableId);

    if (playersError || !players || players.length < 1) {
      throw new Error('Not enough players');
    }

    console.log('Dealing initial cards to', players.length, 'players');

    // Deal 2 cards to each player
    for (const player of players) {
      const card1 = dealCard();
      const card2 = dealCard();
      const hand = [card1, card2];
      const score = calculateScore(hand);

      await supabase
        .from('blackjack_players')
        .update({
          hand,
          score,
          status: 'playing',
        })
        .eq('id', player.id);
    }

    // Deal 2 cards to dealer (one hidden)
    const dealerCard1 = dealCard();
    const dealerCard2 = dealCard();
    const dealerHand = [dealerCard1, dealerCard2];
    const dealerScore = calculateScore(dealerHand);

    // Set first player as current player
    const firstPlayer = players[0];

    // Update table to in_progress
    await supabase
      .from('blackjack_tables')
      .update({
        status: 'in_progress',
        started_at: new Date().toISOString(),
        dealer_hand: dealerHand,
        dealer_score: dealerScore,
        current_player_id: firstPlayer.id,
        turn_started_at: new Date().toISOString(),
      })
      .eq('id', tableId);

    console.log('Game started successfully');

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in blackjack-start-game:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
