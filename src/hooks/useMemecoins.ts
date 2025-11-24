import { useState, useEffect } from 'react';

export interface Memecoin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
  price_change_percentage_7d: number;
  total_volume: number;
  high_24h: number;
  low_24h: number;
  circulating_supply: number;
}

const MEMECOIN_IDS = [
  'dogecoin',
  'shiba-inu',
  'pepe',
  'bonk',
  'floki',
  'baby-doge-coin',
  'dogwifcoin',
  'book-of-meme',
  'mog-coin',
  'cat-in-a-dogs-world',
  'popcat',
  'myro',
  'wen-4',
  'samoyedcoin',
  'jeo-boden',
];

const CACHE_DURATION = 30000; // 30 seconds
let cache: { data: Memecoin[]; timestamp: number } | null = null;

export const useMemecoins = () => {
  const [memecoins, setMemecoins] = useState<Memecoin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMemecoins = async () => {
      // Check cache first
      if (cache && Date.now() - cache.timestamp < CACHE_DURATION) {
        setMemecoins(cache.data);
        setLoading(false);
        return;
      }

      try {
        setError(null);
        const ids = MEMECOIN_IDS.join(',');
        const response = await fetch(
          `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h,7d`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch memecoin data');
        }

        const data: Memecoin[] = await response.json();

        // Update cache
        cache = {
          data,
          timestamp: Date.now(),
        };

        setMemecoins(data);
      } catch (err) {
        console.error('Error fetching memecoins:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch data');
      } finally {
        setLoading(false);
      }
    };

    fetchMemecoins();
    // Refresh every minute
    const interval = setInterval(fetchMemecoins, 60000);

    return () => clearInterval(interval);
  }, []);

  return { memecoins, loading, error };
};
