import { parse } from '../star-parser/index';
import { evaluate } from './index';

export type RunResult = {
  env: Record<string, any>;
  plots: any[];
  indicators: any[];
};

export function makeDefaultEnv() {
  const plots: any[] = [];
  // create a small synthetic series for examples (most examples only need a few values)
  const seriesLen = 200;
  const closeSeries = Array.from({ length: seriesLen }, (_, i) => 100 + i * 0.5);
  const highSeries = closeSeries.map(v => v + 1);
  const lowSeries = closeSeries.map(v => v - 1);

  const env: Record<string, any> = {
    math: { avg: (...args: number[]) => args.reduce((s,n) => s+n,0)/args.length },
    color: { rgb: (r:number,g:number,b:number) => `rgb(${r},${g},${b})` },
    // input.int can be called as input.int(def, title, "Name") or input.int(def, { title: 'Name' })
    input: { int: (...args:any[]) => {
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
    plot: (...args:any[]) => { plots.push({ callee: 'plot', args }); return null; },
    plots,
    // series emulation
    close: closeSeries,
    high: highSeries,
    low: lowSeries,
  };
  // simple request helper: returns a series for the requested symbol/timeframe
  env.request = {
    security: (symbol: string, timeframe: string, expr: any) => {
      // In this lightweight runtime we return the current close series as a proxy
      // for the requested symbol/timeframe. If expr is a primitive/value, return it.
      if (Array.isArray(expr)) return expr;
      return env.close;
    }
  };
  // Add common TA helpers to the environment
  env.ta = {
    sma: (src: any, len: number) => {
      if (Array.isArray(src)) {
        const n = Math.max(1, Math.floor(len) || 1);
        const slice = src.slice(-n);
        const sum = slice.reduce((s:number,v:number) => s + (Number(v)||0), 0);
        return sum / slice.length;
      }
      return src;
    },
    rsi: (src: any, len: number) => {
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
    highest: (src: any, len: number) => Array.isArray(src) ? Math.max(...src.slice(-(len||1))) : src,
    lowest: (src: any, len: number) => Array.isArray(src) ? Math.min(...src.slice(-(len||1))) : src,
  };

  // strategy stub with simple entry/exit recording
  env.strategy = {
    commission: { percent: 'strategy.commission.percent' },
    _internal: { entries: [], exits: [] },
    entry: (id: any, qty?: any) => {
      env.strategy._internal.entries.push({ id, qty });
      return null;
    },
    exit: (id: any) => {
      env.strategy._internal.exits.push({ id });
      return null;
    }
  };
  return env;
}

export function runScript(source: string): RunResult {
  const prog = parse(source);
  const env = makeDefaultEnv();
  const indicators = prog.indicators || [];
  for (const a of prog.assignments || []) {
    const id = a.id;
    const val = evaluate(a.expr, env as any);
    if (id === '_call') {
      // calls like plot(...) have already pushed to env.plots via plot stub
      continue;
    }
    env[id] = val;
  }
  return { env, plots: env.plots || [], indicators };
}

export default { runScript, makeDefaultEnv };
  
