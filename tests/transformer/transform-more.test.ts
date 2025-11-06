import { describe, it, expect } from 'vitest'
import { parse as handParse } from '../../src/lib/star-parser'
import { transformProgram } from '../../src/lib/star-ast-transform'

describe('transformer more mappings', () => {
  it('maps sma -> star.ta.sma and plot -> star.plot', () => {
    const src = `indicator("t")\n a = sma(close, 14)\n plot(a)\n`;
    const p = handParse(src as unknown);
    const t = transformProgram(p as unknown);
    const assignment = t.assignments.find((x: unknown) => x.id === 'a');
    expect(assignment.expr.type).toBe('Call');
    expect(assignment.expr.callee).toBe('star.ta.sma');

    // verify plot mapping (last assignment is _call from parser shim)
    const call = t.assignments.find((x: unknown) => x.id === '_call');
    expect(call.expr.type).toBe('Call');
    expect(call.expr.callee).toBe('star.plot');
  });

  it('maps request.security -> star.request.security', () => {
    const src = `a = request.security(syminfo.tickerid, 'D', close)\n`;
    const p = handParse(src as unknown);
    const t = transformProgram(p as unknown);
    const a = t.assignments.find((x: unknown) => x.id === 'a');
    expect(a.expr.callee).toBe('star.request.security');
  });

  it('maps input -> star.input', () => {
    const src = `a = input(10)\n`;
    const p = handParse(src as unknown);
    const t = transformProgram(p as unknown);
    const a = t.assignments.find((x: unknown) => x.id === 'a');
    expect(a.expr.callee).toBe('star.input');
  });
});
