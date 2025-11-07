// Coinflip create edge function
// Locks creator items server-side and creates the coinflip game

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Side = 'heads' | 'tails'

interface CreatorItem {
  item_id: string
  name: string
  value: number
  quantity: number
  image_url: string | null
  rarity: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { items, side } = await req.json()

    if (!Array.isArray(items) || items.length === 0 || (side !== 'heads' && side !== 'tails')) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const itemsData = items as CreatorItem[]
    const betAmount = itemsData.reduce((s, it) => s + it.value * it.quantity, 0)

    // Validate creator items (no deduction on create)
    for (const it of itemsData) {
      const { data: inv, error } = await supabaseAdmin
        .from('user_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('item_id', it.item_id)
        .maybeSingle()

      if (error || !inv || inv.quantity < it.quantity) {
        return new Response(JSON.stringify({ error: `Not enough ${it.name}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // Create game using user-scoped client so RLS withCheck passes
    const { data: game, error: gameError } = await supabaseClient
      .from('coinflip_games')
      .insert({
        creator_id: user.id,
        bet_amount: betAmount,
        creator_side: side as Side,
        creator_items: itemsData,
        status: 'waiting',
      })
      .select('*')
      .maybeSingle()

    if (gameError || !game) {
      return new Response(JSON.stringify({ error: 'Failed to create game' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // No transactions on create; bets are recorded at join time

    return new Response(JSON.stringify({ game }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('coinflip-create error', e)
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})