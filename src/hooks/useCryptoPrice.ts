import { useState, useEffect } from "react";

interface CryptoData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  lastUpdated: Date;
  isPositive: boolean;
}

const COINGECKO_API = "https://api.coingecko.com/api/v3";

export const useCryptoPrice = (coinId: string = "litecoin") => {
  const [cryptoData, setCryptoData] = useState<CryptoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        `${COINGECKO_API}/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false&sparkline=false`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch crypto data");
      }

      const data = await response.json();

      const change24h = data.market_data.price_change_percentage_24h || 0;

      setCryptoData({
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        price: data.market_data.current_price.usd || 0,
        change24h: change24h,
        high24h: data.market_data.high_24h.usd || 0,
        low24h: data.market_data.low_24h.usd || 0,
        volume24h: data.market_data.total_volume.usd || 0,
        marketCap: data.market_data.market_cap.usd || 0,
        lastUpdated: new Date(data.last_updated),
        isPositive: change24h >= 0,
      });

      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error("Error fetching crypto data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCryptoData();

    // Refresh every second for live updates
    const interval = setInterval(fetchCryptoData, 1000);

    return () => clearInterval(interval);
  }, [coinId]);

  return { cryptoData, isLoading, error, refresh: fetchCryptoData };
};
