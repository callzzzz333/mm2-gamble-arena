import { useState, useEffect, useRef } from 'react';
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
  const previousDataRef = useRef<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setData(null);
      previousDataRef.current = null;
      return;
    }

    const fetchResaleData = async () => {
      try {
        if (loading) setLoading(true);
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

        // Compare with previous data to avoid unnecessary updates
        const dataString = JSON.stringify(functionData);
        if (previousDataRef.current !== dataString) {
          previousDataRef.current = dataString;
          setData(functionData);
        }
      } catch (err) {
        console.error('Error fetching resale data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        if (loading) setLoading(false);
      }
    };

    fetchResaleData();
    
    // Auto-refresh chart data every second
    const interval = setInterval(fetchResaleData, 1000);
    
    return () => clearInterval(interval);
  }, [assetId]);

  return { data, loading, error };
};
