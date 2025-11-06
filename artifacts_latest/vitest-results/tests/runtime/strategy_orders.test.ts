import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';

describe('strategy order simulation', () => {
  it('fills buy orders and updates position and pnl', () => {
    const src = `
strategy.entry("long1", 10)
`;
    const res = runScript(src);
    // position must exist and size should be > 0
    expect(res.env.strategy._internal.position.size).toBeGreaterThan(0);
    // trades recorded
    expect(res.env.strategy._internal.trades.length).toBeGreaterThanOrEqual(1);
    // pnl is computable (number)
    expect(typeof res.env.strategy.pnl()).toBe('number');
  });

  it('order sells reduce position', () => {
    const src = `
strategy.entry("long1", 5)
strategy.exit("long1")
`;
    const res = runScript(src);
    expect(res.env.strategy._internal.position.size).toBe(0);
    expect(res.env.strategy._internal.trades.some((t:any)=>t.side==='sell')).toBeTruthy();
  });
});
