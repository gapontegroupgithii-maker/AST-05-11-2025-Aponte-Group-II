import { parse } from '../star-parser/index';
import { evaluate } from './index';

export type RunResult = {
  env: Record<string, unknown>;
  plots: unknown[];
  indicators: unknown[];
};

export function makeDefaultEnv() {
  const plots: unknown[] = [];
  // create a small synthetic series for examples (most examples only need a few values)
  const seriesLen = 200;
  const closeSeries = Array.from({ length: seriesLen }, (_, i) => 100 + i * 0.5);
  const highSeries = closeSeries.map(v => v + 1);
  const lowSeries = closeSeries.map(v => v - 1);

  const env: Record<string, unknown> = {
    math: { avg: (...args: number[]) => args.reduce((s,n) => s+n,0)/args.length },
    color: { rgb: (r:number,g:number,b:number) => `rgb(${r},${g},${b})` },
    // input.int can be called as input.int(def, title, "Name") or input.int(def, { title: 'Name' })
    input: { int: (...args: unknown[]) => {
      const def = args[0];
      // detect named form
      if (args.length >= 3 && typeof args[1] === 'string') {
        const name = args[1];
        const value = args[2];
        env._inputs = env._inputs || {};
        env._inputs[name] = value;
      } else if (args[1] && typeof args[1] === 'object' && args[1].title) {
        env._inputs = env._inputs || {};
        env._inputs[args[1].title] = def;
      }
      return def;
    } },
    plot: (...args: unknown[]) => {
      // support plot(series, title) or plot(series, { title, color })
      let series = args[0];
      let opts: unknown = {};
      if (args.length >= 2) {
        if (typeof args[1] === 'string') opts.title = args[1];
        else if (typeof args[1] === 'object') opts = { ...args[1] };
      }
      plots.push({ callee: 'plot', series, options: opts, rawArgs: args });
      return null;
    },
    plots,
    // series emulation
    close: closeSeries,
    high: highSeries,
    low: lowSeries,
  };
  // simple request helper: returns a series for the requested symbol/timeframe
  env.request = {
      security: (symbol: string, timeframe: string, expr: unknown) => {
        // Enhance: return a synthetic series derived from symbol+timeframe so different
        // symbols/timeframes produce different (but deterministic) arrays for tests.
        const seed = stringHash(String(symbol) + '|' + String(timeframe));
        // If expr is an explicit array (e.g., close), use it but apply a deterministic offset
        if (Array.isArray(expr)) {
          return (expr as number[]).map((v: number, i: number) => v + ((seed % 10) - 5) / 100 + Math.sin(i + seed) / 100);
        }
        // fallback: base on env.close
        return env.close.map((v: number, i: number) => v + ((seed % 10) - 5) / 100 + Math.sin(i + seed) / 100);
      }
    };

    function stringHash(s: string) {
      let h = 0;
      for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i), h |= 0;
      return Math.abs(h);
    }
  // Add common TA helpers to the environment
  env.ta = {
    sma: (src: unknown, len: number) => {
      if (Array.isArray(src)) {
        const n = Math.max(1, Math.floor(len) || 1);
        const slice = src.slice(-n);
        const sum = slice.reduce((s:number,v:number) => s + (Number(v)||0), 0);
        return sum / slice.length;
      }
      return src;
    },
    rsi: (src: unknown, len: number) => {
      if (!Array.isArray(src)) return 50;
      const n = Math.max(1, Math.floor(len) || 14);
      const slice = src.slice(- (n + 1));
      if (slice.length <= 1) return 50;
      let gains = 0, losses = 0, count = 0;
      for (let i = 1; i < slice.length; i++) {
        const diff = slice[i] - slice[i-1];
        if (diff > 0) gains += diff; else losses += -diff;
        count++;
      }
      const avgGain = gains / count; const avgLoss = losses / count;
      if (avgGain + avgLoss === 0) return 50;
      const rs = avgGain / (avgLoss || 1e-9);
      const rsi = 100 - (100 / (1 + rs));
      return rsi;
    },
    highest: (src: unknown, len: number) => Array.isArray(src) ? Math.max(...src.slice(-(len||1))) : src,
    lowest: (src: unknown, len: number) => Array.isArray(src) ? Math.min(...src.slice(-(len||1))) : src,
  };
  // strategy stub with simple entry/exit recording and lightweight position tracking
  env.strategy = {
  // commission.percent can be a number (fraction, e.g. 0.001) or a path in env
  commission: { percent: 0.0 },
  _internal: { entries: [], exits: [], position: { size: 0, avg: 0 }, orders: [], trades: [], realizedPnL: 0 },
    _internal: { entries: [], exits: [], position: { size: 0, avg: 0 }, orders: [], trades: [] },
    entry: (id: unknown, qty?: number) => {
      env.strategy._internal.entries.push({ id, qty });
      // use order to fill
      env.strategy.order(id, 'buy', qty);
      return null;
    },
    exit: (id: unknown) => {
      env.strategy._internal.exits.push({ id });
      // close entire position for this id
      const pos = env.strategy._internal.position;
      if (pos.size > 0) env.strategy.order(id, 'sell', pos.size);
      return null;
    },
    // immediate-market order simulation: fills at last close price
    // order supports optional opts: { slippage: 0.001, fillPercent: 0.5 }
    order: function(id: unknown, action: string, qty?: number, opts?: unknown) {
      // support both object opts and named-arg form where args are: ..., 'name', value
      // capture any extra args from arguments to detect name/value pairs
      const extra: unknown[] = Array.prototype.slice.call(arguments, 3);
      // Normalize opts: prefer an object and merge named-arg pairs from extra
      let localOpts: Record<string, unknown> = (opts && typeof opts === 'object') ? opts : {};
      if (extra && extra.length >= 2) {
        for (let i = 0; i < extra.length; i += 2) {
          const k = extra[i];
          const v = extra[i + 1];
          if (typeof k === 'string') localOpts[k] = v;
        }
      }
      const price = Array.isArray(env.close) ? env.close[env.close.length - 1] : 0;
      const requested = Math.max(0, Number(qty) || 1);
  const fillPercent = (localOpts && typeof localOpts.fillPercent === 'number') ? Math.max(0, Math.min(1, localOpts.fillPercent)) : 1;
  const filledQty = Math.max(0, Math.floor(requested * fillPercent));
  const slippage = (localOpts && typeof localOpts.slippage === 'number') ? Number(localOpts.slippage) : 0;
      // adjust price according to action and slippage
      const adjPrice = (action === 'buy' || action === 'long') ? price * (1 + slippage) : price * (1 - slippage);
      env.strategy._internal.orders = env.strategy._internal.orders || [];
      const entry = { id, action, requestedQty: requested, qty: filledQty, price: adjPrice, slippage, time: Date.now() };
      env.strategy._internal.orders.push(entry);
      // fill logic with partial-fill support
      const pos = env.strategy._internal.position;
      env.strategy._internal.trades = env.strategy._internal.trades || [];
      if ((action === 'buy' || action === 'long') && filledQty > 0) {
  // apply commission as cost on buy
  const commissionPct = (env.strategy && env.strategy.commission && typeof env.strategy.commission.percent === 'number') ? env.strategy.commission.percent : 0;
  const commissionCost = adjPrice * filledQty * commissionPct;
  const newSize = pos.size + filledQty;
  // incorporate commission into average price (approximate)
  const newAvg = ((pos.avg * pos.size) + (adjPrice * filledQty) + commissionCost) / (newSize || 1);
  env.strategy._internal.position = { size: newSize, avg: newAvg };
  env.strategy._internal.trades.push({ side: 'buy', qty: filledQty, price: adjPrice, id, requested: requested, commission: commissionCost });
      } else if ((action === 'sell' || action === 'close' || action === 'short') && filledQty > 0) {
        const sellQty = Math.min(filledQty, pos.size);
        const remaining = Math.max(0, pos.size - sellQty);
  // realized PnL: (sellPrice - avg) * qty - commission
  const commissionPct = (env.strategy && env.strategy.commission && typeof env.strategy.commission.percent === 'number') ? env.strategy.commission.percent : 0;
  const commissionCost = adjPrice * sellQty * commissionPct;
  const pnl = ((adjPrice - pos.avg) * sellQty) - commissionCost;
  env.strategy._internal.realizedPnL = (env.strategy._internal.realizedPnL || 0) + pnl;
  env.strategy._internal.trades.push({ side: 'sell', qty: sellQty, price: adjPrice, id, requested: requested, commission: commissionCost, pnl });
        if (remaining === 0) env.strategy._internal.position = { size: 0, avg: 0 };
        else env.strategy._internal.position = { size: remaining, avg: pos.avg };
      }
      return entry;
    },
    position: () => env.strategy._internal.position,
    // compute unrealized PnL (current close vs avg * size)
    // compute total PnL (realized + unrealized)
    pnl: () => {
      const pos = env.strategy._internal.position || { size: 0, avg: 0 };
      const price = Array.isArray(env.close) ? env.close[env.close.length - 1] : 0;
      const unreal = (price - (pos.avg || 0)) * (pos.size || 0);
      const realized = env.strategy._internal.realizedPnL || 0;
      return realized + unreal;
    }
  };
  return env;
}

export function runScript(source: string, options?: { opLimit?: number }): RunResult {
  const prog = parse(source);
  const env = makeDefaultEnv();
  if (options?.opLimit) env._opLimit = options.opLimit;
  const indicators = prog.indicators || [];
  for (const a of prog.assignments || []) {
    const id = a.id;
    const val = evaluate(a.expr, env as unknown as unknown);
    if (id === '_call') {
      // calls like plot(...) have already pushed to env.plots via plot stub
      continue;
    }
    env[id] = val;
  }
  return { env, plots: env.plots || [], indicators };
}

export default { runScript, makeDefaultEnv };
  
