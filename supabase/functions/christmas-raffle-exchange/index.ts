import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    // Create client with service role to perform operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify user with anon key client
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      throw new Error(`Authentication failed: ${authError.message}`);
    }
    
    if (!user) {
      throw new Error('User not found');
    }
    
    console.log('Authenticated user:', user.id);

    const { items } = await req.json();

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('No items provided');
    }

    console.log('Exchange request from user:', user.id, 'Items:', items);

    // Calculate total value and tickets
    let totalValue = 0;
    const itemsToExchange: any[] = [];

    for (const item of items) {
      const { data: itemData } = await supabaseAdmin
        .from('items')
        .select('*')
        .eq('id', item.item_id)
        .single();

      if (!itemData) {
        throw new Error(`Item ${item.item_id} not found`);
      }

      // Check user has this item
      const { data: userItem } = await supabaseAdmin
        .from('user_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', item.item_id)
        .single();

      if (!userItem || userItem.quantity < item.quantity) {
        throw new Error(`Insufficient quantity for item ${itemData.name}`);
      }

      const itemValue = Number(itemData.value) * item.quantity;
      totalValue += itemValue;

      itemsToExchange.push({
        item_id: item.item_id,
        name: itemData.name,
        value: itemData.value,
        quantity: item.quantity,
        rarity: itemData.rarity,
        image_url: itemData.image_url
      });
    }

    // Calculate tickets (1 ticket per $5)
    const ticketsEarned = Math.floor(totalValue / 5);

    if (ticketsEarned === 0) {
      throw new Error('Items must be worth at least $5 to exchange');
    }

    // Remove items from user inventory
    for (const item of items) {
      const { data: userItem } = await supabaseAdmin
        .from('user_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('item_id', item.item_id)
        .single();

      if (userItem.quantity === item.quantity) {
        await supabaseAdmin
          .from('user_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', item.item_id);
      } else {
        await supabaseAdmin
          .from('user_items')
          .update({ quantity: userItem.quantity - item.quantity })
          .eq('user_id', user.id)
          .eq('item_id', item.item_id);
      }
    }

    // Update or insert raffle tickets
    const { data: existingTickets } = await supabaseAdmin
      .from('christmas_raffle_tickets')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existingTickets) {
      const updatedItems = [...existingTickets.items_exchanged, ...itemsToExchange];
      await supabaseAdmin
        .from('christmas_raffle_tickets')
        .update({
          total_tickets: existingTickets.total_tickets + ticketsEarned,
          items_exchanged: updatedItems,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
    } else {
      await supabaseAdmin
        .from('christmas_raffle_tickets')
        .insert({
          user_id: user.id,
          total_tickets: ticketsEarned,
          items_exchanged: itemsToExchange
        });
    }

    // Update the raffle prize pool
    const { data: raffle } = await supabaseAdmin
      .from('christmas_raffle')
      .select('*')
      .eq('year', 2024)
      .single();

    if (raffle) {
      const updatedPrizeItems = [...raffle.prize_items, ...itemsToExchange];
      await supabaseAdmin
        .from('christmas_raffle')
        .update({
          total_prize_value: raffle.total_prize_value + totalValue,
          prize_items: updatedPrizeItems,
          updated_at: new Date().toISOString()
        })
        .eq('id', raffle.id);
    }

    console.log('Exchange successful:', ticketsEarned, 'tickets for', totalValue, 'value');

    return new Response(
      JSON.stringify({
        success: true,
        ticketsEarned,
        totalValue
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error('Error in christmas-raffle-exchange:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});