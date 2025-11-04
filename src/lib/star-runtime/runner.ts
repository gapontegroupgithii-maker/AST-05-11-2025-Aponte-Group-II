import { parse } from '../star-parser/index';
import { evaluate } from './index';

export type RunResult = {
  env: Record<string, any>;
  plots: any[];
  indicators: any[];
};

export function makeDefaultEnv() {
  const plots: any[] = [];
  const env: Record<string, any> = {
    math: { avg: (...args: number[]) => args.reduce((s,n) => s+n,0)/args.length },
    color: { rgb: (r:number,g:number,b:number) => `rgb(${r},${g},${b})` },
    input: { int: (def:number, opts?: any) => def },
    plot: (...args:any[]) => { plots.push({ callee: 'plot', args }); return null; },
    plots,
    // simple market variables
    close: 100,
    high: 100,
    low: 100,
  };
  // Add common TA and strategy stubs
  env.ta = {
    sma: (src: any, len: number) => {
      // naive: return src (since we don't model series); for tests we only need presence
      return src;
    },
    rsi: (src: any, len: number) => {
      return src; // placeholder
    },
    highest: (src: any, len: number) => src,
    lowest: (src: any, len: number) => src,
  };
  env.strategy = {
    commission: { percent: 'strategy.commission.percent' },
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
