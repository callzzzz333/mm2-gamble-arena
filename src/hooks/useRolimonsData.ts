import { useState, useEffect } from 'react';
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

export const useRolimonsData = () => {
  const [data, setData] = useState<RolimonsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'fetch-rolimons-data'
      );

      if (functionError) {
        throw functionError;
      }

      setData(functionData);
    } catch (err) {
      console.error('Error fetching Rolimons data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Fetch every 60 seconds (Rolimons rate limit is 1 req/min)
    const interval = setInterval(fetchData, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
};
