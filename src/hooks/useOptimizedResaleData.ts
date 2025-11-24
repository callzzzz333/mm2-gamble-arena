import { useState, useEffect, useRef, useCallback } from 'react';
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

const CACHE_DURATION = 60000; // 1 minute for chart data
const cache = new Map<string, { data: ResaleData; timestamp: number }>();

export const useOptimizedResaleData = (assetId: string | null) => {
  const [data, setData] = useState<ResaleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchResaleData = useCallback(async () => {
    if (!assetId || fetchingRef.current) return;

    // Check cache
    const cached = cache.get(assetId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'fetch-item-resale-data',
        { body: { assetId } }
      );

      if (functionError) throw functionError;

      // Update cache
      cache.set(assetId, {
        data: functionData,
        timestamp: Date.now()
      });

      setData(functionData);
    } catch (err) {
      console.error('Error fetching resale data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (!assetId) {
      setData(null);
      return;
    }

    fetchResaleData();
  }, [assetId, fetchResaleData]);

  return { data, loading, error };
};
