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
    const { amount, currency = 'btc' } = await req.json();
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    // Create payment via NOWPayments API
    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!nowpaymentsApiKey) {
      throw new Error('NOWPayments API key not configured');
    }

    const paymentResponse = await fetch('https://api.nowpayments.io/v1/payment', {
      method: 'POST',
      headers: {
        'x-api-key': nowpaymentsApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        price_amount: amount,
        price_currency: 'usd',
        pay_currency: currency.toLowerCase(),
        ipn_callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/crypto-payment-webhook`,
        order_id: `${user.id}_${Date.now()}`,
        order_description: 'MM2 Royale Deposit',
      }),
    });

    if (!paymentResponse.ok) {
      const errorData = await paymentResponse.json();
      console.error('NOWPayments error:', errorData);
      throw new Error('Failed to create payment');
    }

    const paymentData = await paymentResponse.json();

    // Store payment in database
    const { data: deposit, error: depositError } = await supabase
      .from('crypto_deposits')
      .insert({
        user_id: user.id,
        payment_id: paymentData.payment_id,
        currency: currency.toLowerCase(),
        amount: paymentData.pay_amount,
        usd_amount: amount,
        pay_address: paymentData.pay_address,
        payment_status: paymentData.payment_status,
        payment_url: paymentData.payment_url || paymentData.invoice_url,
      })
      .select()
      .single();

    if (depositError) {
      console.error('Database error:', depositError);
      throw depositError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        payment: {
          ...deposit,
          pay_address: paymentData.pay_address,
          payment_url: paymentData.payment_url || paymentData.invoice_url,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
