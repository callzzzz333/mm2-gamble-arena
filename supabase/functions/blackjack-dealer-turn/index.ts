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

    console.log('Dealer turn for table:', tableId);

    // Get table
    const { data: table, error: tableError } = await supabase
      .from('blackjack_tables')
      .select('*')
      .eq('id', tableId)
      .single();

    if (tableError || !table) {
      throw new Error('Table not found');
    }

    let dealerHand = table.dealer_hand;
    let dealerScore = calculateScore(dealerHand);

    console.log('Initial dealer score:', dealerScore);

    // Dealer hits until 17 or higher
    while (dealerScore < 17) {
      const newCard = dealCard();
      dealerHand = [...dealerHand, newCard];
      dealerScore = calculateScore(dealerHand);
      console.log('Dealer hit, new score:', dealerScore);
    }

    // Update dealer hand
    await supabase
      .from('blackjack_tables')
      .update({
        dealer_hand: dealerHand,
        dealer_score: dealerScore,
      })
      .eq('id', tableId);

    console.log('Final dealer score:', dealerScore);

    // Determine winners
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/blackjack-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      },
      body: JSON.stringify({ tableId, dealerScore }),
    });

    return new Response(
      JSON.stringify({ success: true, dealerScore }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in blackjack-dealer-turn:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
