import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { assetId } = await req.json();
    
    if (!assetId) {
      throw new Error('Asset ID is required');
    }

    console.log(`Fetching resale data for asset ${assetId}...`);
    
    // Fetch resale data from Roblox Economy API
    const resaleResponse = await fetch(
      `https://economy.roblox.com/v1/assets/${assetId}/resale-data`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    if (!resaleResponse.ok) {
      console.log(`Resale API returned ${resaleResponse.status} for asset ${assetId}`);
      // Return empty data if not available
      return new Response(
        JSON.stringify({
          success: true,
          assetId,
          hasData: false,
          sales: [],
          volumeHistory: [],
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const resaleData = await resaleResponse.json();
    
    // Transform the data into a format suitable for charting
    const chartData = resaleData.recentAveragePrice?.map((point: any) => ({
      date: new Date(point.date).toLocaleDateString(),
      price: point.price || 0,
      volume: point.volume || 0,
    })) || [];

    return new Response(
      JSON.stringify({
        success: true,
        assetId,
        hasData: chartData.length > 0,
        sales: chartData,
        volumeHistory: resaleData.volumeHistory || [],
        assetStock: resaleData.assetStock || 0,
        numberRemaining: resaleData.numberRemaining || 0,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching resale data:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
