import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ⚠️ CRITICAL SECURITY WARNING ⚠️
// This webhook has NO authentication and is vulnerable to payment fraud.
// An attacker can forge payment confirmations and steal funds.
// TODO: Implement NOWPayments IPN signature validation before production use.
// See: https://documenter.getpostman.com/view/7907941/2s93JusNJt

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Webhook received:', payload);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the deposit record
    const { data: deposit, error: fetchError } = await supabase
      .from('crypto_deposits')
      .select('*')
      .eq('payment_id', payload.payment_id)
      .single();

    if (fetchError || !deposit) {
      console.error('Deposit not found:', payload.payment_id);
      return new Response(
        JSON.stringify({ error: 'Deposit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment status
    const { error: updateError } = await supabase
      .from('crypto_deposits')
      .update({
        payment_status: payload.payment_status,
        updated_at: new Date().toISOString(),
        confirmed_at: ['finished', 'confirmed'].includes(payload.payment_status) 
          ? new Date().toISOString() 
          : null,
      })
      .eq('payment_id', payload.payment_id);

    if (updateError) {
      console.error('Update error:', updateError);
      throw updateError;
    }

    // If payment is confirmed, credit user balance
    if (['finished', 'confirmed'].includes(payload.payment_status) && !deposit.confirmed_at) {
      console.log('Crediting balance for user:', deposit.user_id, 'amount:', deposit.usd_amount);
      
      // Update user balance using RPC function
      const { data: balanceResult, error: balanceError } = await supabase.rpc(
        'update_user_balance',
        {
          p_user_id: deposit.user_id,
          p_amount: deposit.usd_amount,
          p_type: 'deposit',
          p_description: `Crypto deposit (${deposit.currency.toUpperCase()})`,
        }
      );

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        throw balanceError;
      }

      console.log('Balance credited successfully');
      
      // Also mark the deposit as confirmed in crypto_deposits table
      await supabase
        .from('crypto_deposits')
        .update({ confirmed_at: new Date().toISOString() })
        .eq('payment_id', payload.payment_id);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
