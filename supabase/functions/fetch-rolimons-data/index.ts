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
    console.log('Fetching Rolimons item data...');
    
    const response = await fetch('https://www.rolimons.com/itemapi/itemdetails', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Rolimons API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Transform the data into a more usable format
    const transformedItems = Object.entries(data.items || {}).map(([id, itemData]: [string, any]) => ({
      rolimons_id: id,
      name: itemData[0] || '',
      acronym: itemData[1] || '',
      rap: itemData[2] || 0,
      value: itemData[3] || 0,
      default_value: itemData[4] || 0,
      demand: itemData[5] || 0,
      trend: itemData[6] || 0,
      projected: itemData[7] || 0,
      hyped: itemData[8] || 0,
      rare: itemData[9] || 0,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        item_count: data.item_count || 0,
        items: transformedItems,
        last_updated: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching Rolimons data:', error);
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
