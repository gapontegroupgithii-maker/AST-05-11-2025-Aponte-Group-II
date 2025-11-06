import { describe, it, expect } from 'vitest';
import { evaluate } from '../../src/lib/star-runtime/index';

describe('star-runtime evaluate', () => {
  it('evaluates binary expressions', () => {
    const ast = { type: 'Binary', op: '+', left: { type: 'Number', value: 2 }, right: { type: 'Number', value: 3 } };
    expect(evaluate(ast)).toBe(5);
  });

  it('evaluates nested calls using env functions', () => {
    const env = {
      math: {
        avg: (...args: number[]) => args.reduce((s,n) => s+n,0)/args.length
      },
      color: {
        rgb: (r:number,g:number,b:number) => `rgb(${r},${g},${b})`
      }
    } as unknown;

    const avgCall = { type: 'Call', callee: 'math.avg', args: [ { type: 'Number', value: 1 }, { type: 'Number', value: 3 }, { type: 'Number', value: 5 } ] };
    expect(evaluate(avgCall, env)).toBe(3);

    const colorCall = { type: 'Call', callee: 'color.rgb', args: [ { type: 'Number', value: 10 }, { type: 'Number', value: 20 }, { type: 'Number', value: 30 } ] };
    expect(evaluate(colorCall, env)).toBe('rgb(10,20,30)');
  });

  it('resolves identifiers from env and booleans', () => {
    const env = { foo: 42 } as unknown;
    expect(evaluate({ type: 'Identifier', name: 'foo' }, env)).toBe(42);
    expect(evaluate({ type: 'Identifier', name: 'true' }, env)).toBe(true);
  });
});
