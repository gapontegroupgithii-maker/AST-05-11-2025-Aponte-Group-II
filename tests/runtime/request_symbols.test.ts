import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';

describe('request.security symbol differentiation', () => {
  it('returns different series for different symbols', () => {
    const src = `
 a = request.security("SPY", "D", close)
 b = request.security("QQQ", "D", close)
`;
    const res = runScript(src);
    expect(res.env).toHaveProperty('a');
    expect(res.env).toHaveProperty('b');
    expect(Array.isArray(res.env.a)).toBeTruthy();
    expect(Array.isArray(res.env.b)).toBeTruthy();
    // series should not be identical (first element differs)
    expect(res.env.a[0]).not.toBe(res.env.b[0]);
  });
});
