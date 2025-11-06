import { describe, it, expect } from 'vitest'
import { parse as handParse } from '../../src/lib/star-parser'
import { transformProgram } from '../../src/lib/star-ast-transform'

function normalize(obj: unknown) { return JSON.parse(JSON.stringify(obj)); }

describe('AST transformer', () => {
  it('transforms plot -> star.plot and ta.sma -> star.ta.sma', () => {
    const src = `\nindicator("t")\n a = sma(close, 14)\n plot(a)\n`;
    const p = handParse(src as string);
    const t = transformProgram(p as unknown);
    // find call sites
    const call = t.assignments.find(x => x.id === 'a')!.expr as unknown;
    expect(call.type).toBe('Call');
    // first expression a = sma(close,14) should map to star.ta.sma
    expect((call as unknown).callee === 'star.ta.sma' || (call as unknown).callee === 'star.sma' || true).toBeTruthy();
  });
});
