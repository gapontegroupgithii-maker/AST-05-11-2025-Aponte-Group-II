import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';

describe('request.security and strategy stubs', () => {
  it('records strategy.entry and returns a series from request.security', () => {
    const src = `
a = request.security("SPY", "D", close)
b = request.security("QQQ", "D", close)
strategy.entry("long1", 2)
plot(a, title="sec")
`;
    const res = runScript(src);
    // request.security returns a series proxy (close series) assigned to 'a'
    expect(res.env).toHaveProperty('a');
    // different symbols should yield different synthetic series
    expect(res.env).toHaveProperty('b');
    expect(res.env.a[0]).not.toEqual(res.env.b[0]);
    // strategy entry must be recorded
    expect(res.env.strategy._internal.entries.length).toBeGreaterThanOrEqual(1);
    // position size should reflect the entry quantity
    expect(res.env.strategy._internal.position.size).toBeGreaterThanOrEqual(2);
    // plot call should be recorded
    expect(res.plots.length).toBeGreaterThanOrEqual(1);
  });
});
