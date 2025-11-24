import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RolimonsItem {
  rolimons_id: string;
  name: string;
  acronym: string;
  rap: number;
  value: number;
  default_value: number;
  demand: number;
  trend: number;
  projected: number;
  hyped: number;
  rare: number;
  image_url: string | null;
}

interface RolimonsData {
  success: boolean;
  item_count: number;
  items: RolimonsItem[];
  last_updated: string;
}

const CACHE_DURATION = 30000; // 30 seconds
const REFETCH_INTERVAL = 60000; // 1 minute

export const useOptimizedRolimonsData = () => {
  const [data, setData] = useState<RolimonsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<{ data: RolimonsData; timestamp: number } | null>(null);
  const fetchingRef = useRef(false);

  const fetchData = useCallback(async (forceRefresh = false) => {
    // Check cache first
    if (!forceRefresh && cacheRef.current) {
      const age = Date.now() - cacheRef.current.timestamp;
      if (age < CACHE_DURATION) {
        setData(cacheRef.current.data);
        setLoading(false);
        return;
      }
    }

    // Prevent duplicate fetches
    if (fetchingRef.current) return;

    try {
      fetchingRef.current = true;
      setError(null);

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'fetch-rolimons-data'
      );

      if (functionError) throw functionError;

      // Update cache
      cacheRef.current = {
        data: functionData,
        timestamp: Date.now()
      };

      setData(functionData);
    } catch (err) {
      console.error('Error fetching Rolimons data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      fetchingRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    
    // Refetch every minute instead of every second
    const interval = setInterval(() => fetchData(true), REFETCH_INTERVAL);
    
    return () => clearInterval(interval);
  }, [fetchData]);

  return { data, loading, error, refetch: () => fetchData(true) };
};
