import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ResaleDataPoint {
  date: string;
  price: number;
  volume: number;
}

interface ResaleData {
  success: boolean;
  assetId: string;
  hasData: boolean;
  sales: ResaleDataPoint[];
  volumeHistory: any[];
  assetStock?: number;
  numberRemaining?: number;
}

export const useItemResaleData = (assetId: string | null) => {
  const [data, setData] = useState<ResaleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setData(null);
      return;
    }

    const fetchResaleData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: functionData, error: functionError } = await supabase.functions.invoke(
          'fetch-item-resale-data',
          {
            body: { assetId }
          }
        );

        if (functionError) {
          throw functionError;
        }

        setData(functionData);
      } catch (err) {
        console.error('Error fetching resale data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchResaleData();
    
    // Auto-refresh chart data every second
    const interval = setInterval(fetchResaleData, 1000);
    
    return () => clearInterval(interval);
  }, [assetId]);

  return { data, loading, error };
};
