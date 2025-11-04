import { describe, it, expect } from 'vitest';
import { runScript } from '../../src/lib/star-runtime/runner';

describe('runtime opLimit', () => {
  it('throws when operation budget exceeded', () => {
    // construct a script with many trivial assignments to exhaust opLimit
    const lines = Array.from({ length: 20 }, (_, i) => `a${i} = 1`);
    const src = lines.join('\n');
    expect(() => runScript(src, { opLimit: 5 })).toThrow(/operation limit/);
  });
});
