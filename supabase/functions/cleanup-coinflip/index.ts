import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const minutesParam = url.searchParams.get('minutes');
    const minutes = Math.max(1, Math.min(30, Number(minutesParam) || 5));
    const cutoff = new Date(Date.now() - minutes * 60 * 1000).toISOString();

    // Admin client (service role) to bypass RLS for maintenance tasks
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Find waiting games older than cutoff
    const { data: oldGames, error: findErr } = await supabaseAdmin
      .from('coinflip_games')
      .select('id, creator_id, creator_items, status, created_at')
      .eq('status', 'waiting')
      .lte('created_at', cutoff)
      .limit(500);

    if (findErr) throw findErr;

    let expired = 0;
    let refunded = 0;
    let deleted = 0;

    if (oldGames && oldGames.length) {
      for (const game of oldGames) {
        // Atomically mark as expired (skip if already handled)
        const { data: locked, error: lockErr } = await supabaseAdmin
          .from('coinflip_games')
          .update({ status: 'expired', completed_at: new Date().toISOString(), result: 'refund' })
          .eq('id', game.id)
          .eq('status', 'waiting')
          .select('id, creator_id, creator_items')
          .single();

        if (lockErr || !locked) continue;
        expired++;

        const items = Array.isArray(locked.creator_items) ? locked.creator_items : [];
        for (const item of items) {
          if (!item?.item_id || !locked.creator_id) continue;

          // Check existing inventory entry
          const { data: existing } = await supabaseAdmin
            .from('user_items')
            .select('id, quantity')
            .eq('user_id', locked.creator_id)
            .eq('item_id', item.item_id)
            .single();

          if (existing) {
            await supabaseAdmin
              .from('user_items')
              .update({ quantity: (existing.quantity || 0) + (item.quantity || 1) })
              .eq('id', existing.id);
          } else {
            await supabaseAdmin
              .from('user_items')
              .insert({ user_id: locked.creator_id, item_id: item.item_id, quantity: item.quantity || 1 });
          }
          refunded++;
        }

        // Delete game row
        const { error: delErr } = await supabaseAdmin.from('coinflip_games').delete().eq('id', game.id);
        if (!delErr) deleted++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, expired, refunded, deleted, checked: oldGames?.length || 0 }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('cleanup-coinflip error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});