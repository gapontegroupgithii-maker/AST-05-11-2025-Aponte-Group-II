import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';

describe('request.security and strategy stubs', () => {
  it('records strategy.entry and returns a series from request.security', () => {
    const src = `
a = request.security("SPY", "D", close)
strategy.entry("long1", 100)
plot(a, title="sec")
`;
    const res = runScript(src);
    // request.security returns a series proxy (close series) assigned to 'a'
    expect(res.env).toHaveProperty('a');
    // strategy entry must be recorded
    expect(res.env.strategy._internal.entries.length).toBeGreaterThanOrEqual(1);
    // plot call should be recorded
    expect(res.plots.length).toBeGreaterThanOrEqual(1);
  });
});
