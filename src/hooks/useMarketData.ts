import { useEffect, useRef, useState, useCallback, useMemo } from 'react';

type OHLCV = { time: number; open: number; high: number; low: number; close: number; volume: number };

const DEFAULT_LIMIT = 500;

const timeframeToBinanceInterval = (tf?: string) => {
  if (!tf) return '1d';
  const map: Record<string, string> = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '4h': '4h',
    '12h': '12h',
    '1d': '1d',
    '1w': '1w',
    '1M': '1M',
  };
  const key = tf.toLowerCase();
  // support some common casings like 1H / 1h and 1D / 1d
  if (map[key]) return map[key];
  // fallback: try to normalize by replacing uppercase H/W/M
  if (tf === '1H') return '1h';
  if (tf === '4H') return '4h';
  if (tf === '1D' || tf === '1d') return '1d';
  if (tf === '1W' || tf === '1w') return '1w';
  return '1d';
};

export const useMarketData = (symbol: string, timeframe: string, limit = DEFAULT_LIMIT) => {
  // keep internal state
  const [priceData, setPriceData] = useState<OHLCV[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef<number>(0);
  const active = useRef({ symbol, timeframe });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    // debounce rapid timeframe changes by a short delay
    let cancelled = false;
    console.log('[useMarketData] effect start', { symbol, timeframe, limit });
    const tid = setTimeout(() => {
  const fetchWithRetries = async (retries = 2, delayMs = 300) => {
        const tfInterval = timeframeToBinanceInterval(timeframe);
        const binSymbol = symbol.replace('/', '').toUpperCase();
        const url = `https://api.binance.com/api/v3/klines?symbol=${binSymbol}&interval=${tfInterval}&limit=${limit}`;
  console.log('[useMarketData] fetchWithRetries url', url, { tfInterval, binSymbol, retries });
  for (let attempt = 0; attempt <= retries; attempt++) {
          const controller = new AbortController();
          try {
            console.log('[useMarketData] performing fetch', url);
            const res = await fetch(url, { signal: controller.signal });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (cancelled) return null;
            const formatted: OHLCV[] = (data || []).map((c: unknown) => {
              const arr = c as unknown as (string | number)[];
              return {
                time: Math.floor(Number(arr[0]) / 1000),
                open: parseFloat(String(arr[1])),
                high: parseFloat(String(arr[2])),
                low: parseFloat(String(arr[3])),
                close: parseFloat(String(arr[4])),
                volume: parseFloat(String(arr[5])),
              } as OHLCV;
            });
            return formatted;
          } catch (err) {
            if (controller.signal.aborted) return null;
            if (attempt < retries) {
              // wait and retry
              await new Promise(res => setTimeout(res, delayMs));
              delayMs *= 2;
              continue;
            }
            console.error('[useMarketData] fetch error', err);
            if (!mounted.current) return null;
            const eObj = err instanceof Error ? err : new Error(String(err));
            setError(eObj);
            return null;
          }
        }
        return null;
      };

      const setupWebSocket = (binSymbol: string, tfInterval: string) => {
        try {
          const socketUrl = `wss://stream.binance.com:9443/ws/${binSymbol.toLowerCase()}@kline_${tfInterval}`;
          // close previous if exists
          try {
            if (wsRef.current) {
              // remove handlers then close
              try { wsRef.current.onclose = null; wsRef.current.onmessage = null; wsRef.current.onerror = null; wsRef.current.onopen = null; } catch (e) { /* ignore */ }
              wsRef.current.close();
            }
          } catch (e) { /* ignore */ }

          const ws = new WebSocket(socketUrl);
          wsRef.current = ws;
          reconnectAttemptsRef.current = 0;

          ws.onopen = () => {
            console.debug('[useMarketData] ws open', socketUrl);
            reconnectAttemptsRef.current = 0;
            setIsWsConnected(true);
          };

          ws.onmessage = (evt) => {
            try {
              const payload = JSON.parse(evt.data);
              const k = payload.k;
              if (!k) return;
              const candle = {
                time: Math.floor(k.t / 1000),
                open: parseFloat(k.o),
                high: parseFloat(k.h),
                low: parseFloat(k.l),
                close: parseFloat(k.c),
                volume: parseFloat(k.v),
              };
              setPriceData(prev => {
                if (prev.length === 0) return [candle];
                const last = prev[prev.length - 1];
                if (last.time === candle.time) {
                  const copy = prev.slice();
                  copy[copy.length - 1] = candle;
                  return copy;
                }
                const copy = prev.concat(candle);
                if (copy.length > limit) copy.shift();
                return copy;
              });
            } catch (err) {
              // ignore per-message errors
            }
          };

          ws.onerror = (ev) => { console.warn('[useMarketData] ws error', ev); };

          ws.onclose = (ev) => {
            console.warn('[useMarketData] ws closed', ev.code, ev.reason);
            setIsWsConnected(false);
            // if the component is still active and timeframe/symbol didn't change, try to reconnect
            if (cancelled || !mounted.current) return;
            // schedule reconnect with exponential backoff + jitter
            reconnectAttemptsRef.current = Math.min(10, reconnectAttemptsRef.current + 1);
            const attempt = reconnectAttemptsRef.current;
            const backoff = Math.min(30000, 500 * Math.pow(2, attempt));
            const jitter = Math.floor(Math.random() * 400) - 200; // +/-200ms
            const wait = Math.max(200, backoff + jitter);
            if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
            reconnectTimerRef.current = window.setTimeout(() => {
              // ensure active params still match
              if (active.current.symbol.replace('/', '').toUpperCase() !== binSymbol.replace('/', '').toUpperCase() || timeframeToBinanceInterval(active.current.timeframe) !== tfInterval) {
                return;
              }
              try { setupWebSocket(binSymbol, tfInterval); } catch (e) { /* ignore */ }
            }, wait) as unknown as number;
          };
        } catch (err) {
          console.warn('[useMarketData] ws setup failed', err);
        }
      };

      (async () => {
        setIsLoading(true);
        setError(null);
        const formatted = await fetchWithRetries(2, 300);
        if (cancelled) return;
        if (formatted && mounted.current) {
          setPriceData(formatted);
          setIsLoading(false);
        } else {
          setIsLoading(false);
        }

        // now subscribe websocket for live updates
        try {
          const tfInterval = timeframeToBinanceInterval(timeframe);
          const binSymbol = symbol.replace('/', '').toUpperCase();
          console.log('[useMarketData] setting up websocket', `wss://stream.binance.com:9443/ws/${binSymbol.toLowerCase()}@kline_${tfInterval}`);
          setupWebSocket(binSymbol, tfInterval);
        } catch (err) {
          console.warn('[useMarketData] ws initial setup failed', err);
        }
      })();

      active.current = { symbol, timeframe };
    }, 120);

    return () => {
      cancelled = true;
      clearTimeout(tid);
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null; }
      try { wsRef.current?.close(); } catch (e) { /* ignore */ }
      wsRef.current = null;
    };
  }, [symbol, timeframe, limit]);

  // expose a stable API: forceFetch to allow external control and keep stable object identity
  const fetchKlines = useCallback(async (signal?: AbortSignal) => {
    const tfInterval = timeframeToBinanceInterval(timeframe);
    const binSymbol = symbol.replace('/', '').toUpperCase();
    const url = `https://api.binance.com/api/v3/klines?symbol=${binSymbol}&interval=${tfInterval}&limit=${limit}`;
    try {
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const formatted: OHLCV[] = (data || []).map((c: unknown) => {
        const arr = c as unknown as (string | number)[];
        return {
          time: Math.floor(Number(arr[0]) / 1000),
          open: parseFloat(String(arr[1])),
          high: parseFloat(String(arr[2])),
          low: parseFloat(String(arr[3])),
          close: parseFloat(String(arr[4])),
          volume: parseFloat(String(arr[5])),
        } as OHLCV;
      });
      setPriceData(formatted);
      return formatted;
    } catch (err: unknown) {
      // Ignore AbortError noise when caller aborts the signal intentionally
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if ((err as unknown)?.name === 'AbortError') {
        return [] as OHLCV[];
      }
      console.warn('[useMarketData] fetchKlines error', err);
      throw err;
    }
  }, [timeframe, symbol, limit]);

  const api = useMemo(() => ({
    priceData,
    isLoading,
    error,
    fetchKlines,
    isWsConnected,
  }), [priceData, isLoading, error, fetchKlines, isWsConnected]);

  return api;
};

export default useMarketData;
