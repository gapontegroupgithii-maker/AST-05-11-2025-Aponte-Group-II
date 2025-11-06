export type MarketType = 'derivatives' | 'options' | 'lending';

export interface BrokerMarkets {
  id: string;
  display: string;
  markets: Record<MarketType, string[]>;
}

// Placeholder static data. Replace implementation of fetchAllBrokersMarkets
// to call a real API endpoint when available. The service exposes small
// helpers so the UI can easily switch to a real network source.
const STATIC_BROKERS: BrokerMarkets[] = [
  {
    id: 'Binance',
    display: 'Binance',
    markets: {
      derivatives: ['BTCUSDT_PERP', 'ETHUSDT_PERP', 'SOLUSDT_PERP'],
      options: ['BTC-202601-40000-C', 'ETH-202512-2500-P'],
      lending: ['BTC Lending', 'ETH Lending']
    }
  },
  {
    id: 'Bybit',
    display: 'Bybit',
    markets: {
      derivatives: ['BTCUSD_PERP', 'ETHUSD_PERP'],
      options: ['ETH-202512-3000-C'],
      lending: []
    }
  },
  {
    id: 'Deribit',
    display: 'Deribit',
    markets: {
      derivatives: [],
      options: ['BTC-202601-45000-C','BTC-202601-45000-P','ETH-202512-2500-C'],
      lending: []
    }
  }
];

export async function fetchAllBrokersMarkets(): Promise<BrokerMarkets[]> {
  // In a real implementation, attempt fetch from configured endpoints and
  // fall back to STATIC_BROKERS on error or if no endpoint is configured.
  try {
    // Example: window.__MARKET_ENDPOINT__ could be set by the host
    // if (typeof window !== 'undefined' && (window as unknown).__MARKET_ENDPOINT__) {
    //   const res = await fetch((window as unknown).__MARKET_ENDPOINT__ + '/brokers');
    //   if (res.ok) return await res.json();
    // }
    // For now return static data with a small artificial delay to simulate network
    await new Promise((r) => setTimeout(r, 200));
    return STATIC_BROKERS;
  } catch (err) {
    return STATIC_BROKERS;
  }
}

export async function fetchMarketsForBroker(brokerId: string, type: MarketType): Promise<string[]> {
  const all = await fetchAllBrokersMarkets();
  const b = all.find(x => x.id === brokerId);
  return b ? (b.markets[type] ?? []) : [];
}
