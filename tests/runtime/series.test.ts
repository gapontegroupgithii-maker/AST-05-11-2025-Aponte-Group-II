import { describe, it, expect } from 'vitest';
import { makeDefaultEnv } from '../../src/lib/star-runtime/runner';

describe('star-runtime series helpers', () => {
  it('computes sma over series', () => {
    const env = makeDefaultEnv() as unknown;
    const s = env.close; // synthetic series
    const last10 = s.slice(-10);
    const expected = last10.reduce((a:number,b:number)=>a+b,0)/last10.length;
    expect(env.ta.sma(s, 10)).toBeCloseTo(expected, 6);
  });

  it('computes rsi over series in 0..100', () => {
    const env = makeDefaultEnv() as unknown;
    const s = env.close;
    const r = env.ta.rsi(s, 14);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(r).toBeLessThanOrEqual(100);
  });
});
