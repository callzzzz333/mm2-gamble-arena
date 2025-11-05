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
    const { amount } = await req.json();
    
    // Force Litecoin only
    const currency = 'ltc';
    const fixedAddress = 'LYY4HmKg88pUvDyY4JGhMb8DnJChAmsaru';
    
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

    // Create payment via NOWPayments API - using fixed Litecoin address
    const nowpaymentsApiKey = Deno.env.get('NOWPAYMENTS_API_KEY');
    if (!nowpaymentsApiKey) {
      throw new Error('NOWPayments API key not configured');
    }

    // Get estimated LTC amount for the USD amount
    const estimateResponse = await fetch(
      `https://api.nowpayments.io/v1/estimate?amount=${amount}&currency_from=usd&currency_to=ltc`,
      {
        headers: {
          'x-api-key': nowpaymentsApiKey,
        },
      }
    );

    if (!estimateResponse.ok) {
      throw new Error('Failed to get payment estimate');
    }

    const estimateData = await estimateResponse.json();
    const ltcAmount = estimateData.estimated_amount;

    // Create a unique payment ID for tracking
    const paymentId = `${user.id}_${Date.now()}`;
    
    const paymentData = {
      payment_id: paymentId,
      pay_amount: ltcAmount,
      pay_address: fixedAddress,
      payment_status: 'waiting',
      payment_url: null,
      order_id: paymentId,
    };

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
        payment_url: null,
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
          payment_url: null,
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
