import { describe, it, expect } from 'vitest';
import { transpilePineToStar } from '../../src/lib/star-transpiler';

describe('transpiler scaffold', () => {
  it('transpiles sma+plot to star names', () => {
    const src = `indicator("t")\n a = sma(close, 14)\n plot(a)\n`;
    const out = transpilePineToStar(src);
    expect(out).toContain('star.ta.sma');
    expect(out).toContain('star.plot');
  });
});
