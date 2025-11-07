// Coinflip join + payout edge function
// Performs item extraction from both players and pays out the winner atomically (server-side)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface JoinItem {
  item_id: string
  name: string
  value: number
  quantity: number
  image_url: string | null
  rarity: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Client with user JWT (to read auth user and RLS-safe reads)
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
    })

    // Admin client (bypass RLS for controlled writes)
    const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { gameId, joinerItems } = await req.json()

    if (!gameId || !Array.isArray(joinerItems) || joinerItems.length === 0) {
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch game (must be waiting)
    const { data: game, error: gameError } = await supabaseClient
      .from('coinflip_games')
      .select('*')
      .eq('id', gameId)
      .eq('status', 'waiting')
      .maybeSingle()

    if (gameError || !game) {
      return new Response(JSON.stringify({ error: 'Game not found or not joinable' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (game.creator_id === user.id) {
      return new Response(JSON.stringify({ error: 'Cannot join your own game' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Validate bet ranges
    const creatorTotal = Number(game.bet_amount)
    const joinerTotal = (joinerItems as JoinItem[]).reduce((s, it) => s + it.value * it.quantity, 0)
    const tolerance = creatorTotal * 0.1
    if (joinerTotal < creatorTotal - tolerance || joinerTotal > creatorTotal + tolerance) {
      return new Response(JSON.stringify({ error: 'Bet amount out of range' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Validate inventories
    // 1) Joiner must own their items
    for (const it of joinerItems as JoinItem[]) {
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

    // 2) Creator items may already be locked during creation.
    // If they are still present in inventory, we'll deduct them; otherwise we skip.
    const creatorInventorySnapshot: Record<string, { id: string; quantity: number }> = {}
    for (const it of (game.creator_items as JoinItem[])) {
      const { data: inv } = await supabaseAdmin
        .from('user_items')
        .select('id, quantity')
        .eq('user_id', game.creator_id)
        .eq('item_id', it.item_id)
        .maybeSingle()
      if (inv) creatorInventorySnapshot[it.item_id] = inv
    }

    // Random result (server authoritative)
    const arr = new Uint32Array(1)
    crypto.getRandomValues(arr)
    const result: 'heads' | 'tails' = (arr[0] % 2) === 0 ? 'heads' : 'tails'
    const winnerId = result === game.creator_side ? game.creator_id : user.id

    // Atomically update game to completed if still waiting
    const { error: updateGameError } = await supabaseAdmin
      .from('coinflip_games')
      .update({
        joiner_id: user.id,
        joiner_items: joinerItems,
        winner_id: winnerId,
        result,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', gameId)
      .eq('status', 'waiting')

    if (updateGameError) {
      return new Response(JSON.stringify({ error: 'Could not update game' }), { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Deduct joiner items
    for (const it of joinerItems as JoinItem[]) {
      const { data: inv } = await supabaseAdmin
        .from('user_items')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('item_id', it.item_id)
        .maybeSingle()
      const newQty = (inv?.quantity ?? 0) - it.quantity
      if (inv && newQty >= 0) {
        if (newQty === 0) {
          await supabaseAdmin.from('user_items').delete().eq('id', inv.id)
        } else {
          await supabaseAdmin.from('user_items').update({ quantity: newQty }).eq('id', inv.id)
        }
      }
    }

    // Deduct creator items only if they still exist (skip if already locked)
    for (const it of (game.creator_items as JoinItem[])) {
      const inv = creatorInventorySnapshot[it.item_id]
      if (!inv) continue
      const newQty = (inv.quantity ?? 0) - it.quantity
      if (newQty === 0) {
        await supabaseAdmin.from('user_items').delete().eq('id', inv.id)
      } else if (newQty > 0) {
        await supabaseAdmin.from('user_items').update({ quantity: newQty }).eq('id', inv.id)
      }
    }

    // Payout winner: give ALL items (no house edge)
    const allItems: JoinItem[] = [...(game.creator_items as JoinItem[]), ...(joinerItems as JoinItem[])]
    for (const it of allItems) {
      const { data: existing } = await supabaseAdmin
        .from('user_items')
        .select('id, quantity')
        .eq('user_id', winnerId)
        .eq('item_id', it.item_id)
        .maybeSingle()
      if (existing) {
        await supabaseAdmin
          .from('user_items')
          .update({ quantity: (existing.quantity ?? 0) + it.quantity })
          .eq('id', existing.id)
      } else {
        await supabaseAdmin
          .from('user_items')
          .insert({ user_id: winnerId, item_id: it.item_id, quantity: it.quantity })
      }
    }

    // Transactions
    await supabaseAdmin.from('transactions').insert({
      user_id: user.id,
      amount: -joinerTotal,
      type: 'bet',
      game_type: 'coinflip',
      game_id: gameId,
      description: `Joined coinflip game`,
    })

    await supabaseAdmin.from('transactions').insert({
      user_id: winnerId,
      amount: creatorTotal + joinerTotal,
      type: 'win',
      game_type: 'coinflip',
      game_id: gameId,
      description: `Won coinflip (${result})`,
    })

    const loserId = winnerId === game.creator_id ? user.id : game.creator_id
    await supabaseAdmin.from('transactions').insert({
      user_id: loserId,
      amount: 0,
      type: 'loss',
      game_type: 'coinflip',
      game_id: gameId,
      description: `Lost coinflip (${result})`,
    })

    // Remove game row
    await supabaseAdmin.from('coinflip_games').delete().eq('id', gameId)

    return new Response(JSON.stringify({ result, winnerId }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    console.error('coinflip-join error', e)
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})