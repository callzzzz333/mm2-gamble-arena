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

    // Fetch thumbnails from Roblox API in batches
    const batchSize = 100;
    const thumbnailMap: Record<string, string> = {};
    
    for (let i = 0; i < transformedItems.length; i += batchSize) {
      const batch = transformedItems.slice(i, i + batchSize);
      const assetIds = batch.map(item => item.rolimons_id).join(',');
      
      try {
        const thumbResponse = await fetch(
          `https://thumbnails.roblox.com/v1/assets?assetIds=${assetIds}&returnPolicy=PlaceHolder&size=150x150&format=Png&isCircular=false`
        );
        
        if (thumbResponse.ok) {
          const thumbData = await thumbResponse.json();
          thumbData.data?.forEach((thumb: any) => {
            if (thumb.state === 'Completed' && thumb.imageUrl) {
              thumbnailMap[thumb.targetId.toString()] = thumb.imageUrl;
            }
          });
        }
      } catch (thumbError) {
        console.error('Error fetching thumbnails batch:', thumbError);
      }
    }

    // Add thumbnail URLs to items
    const itemsWithThumbnails = transformedItems.map(item => ({
      ...item,
      image_url: thumbnailMap[item.rolimons_id] || null,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        item_count: data.item_count || 0,
        items: itemsWithThumbnails,
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
