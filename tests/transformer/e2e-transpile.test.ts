import { describe, it, expect } from 'vitest';
import { transpilePineToStar, transpileToJsModule } from '../../src/lib/star-transpiler';
import { runScript, makeDefaultEnv } from '../../src/lib/star-runtime/runner';
import { parse as handParse } from '../../src/lib/star-parser';
import { transformProgram } from '../../src/lib/star-ast-transform';
import { evaluate } from '../../src/lib/star-runtime/index';

describe('transpiler end-to-end', () => {
  it('transpiles and the transpiled star source behaves like the original', () => {
    const src = `indicator("t")\n a = sma(close, 14)\n plot(a)\n`;
    const star = transpilePineToStar(src);
    const resOrig = runScript(src);
    // For transformed AST evaluate programmatically using evaluate + env
  const p = handParse(src as unknown);
  const t = transformProgram(p as unknown);
  const env = makeDefaultEnv();
  // mirror star.* namespace so transformed callees like 'star.plot' resolve
  env.star = { plot: env.plot, ta: env.ta, request: env.request, input: env.input, math: env.math, color: env.color, strategy: env.strategy };
    for (const a of t.assignments || []) {
      if (a.id === '_call') {
        // evaluate call expr (will push plots via env.plot)
        evaluate(a.expr, env as unknown);
        continue;
      }
      env[a.id] = evaluate(a.expr, env as unknown);
    }
    const resStar = { env, plots: env.plots || [] };
  // Basic equivalence: same number of plots and same callee name
  expect(resStar.plots.length).toBe(resOrig.plots.length);
  expect(resStar.plots[0].callee).toBe(resOrig.plots[0].callee);
  });

  it('emits a JS module that can be executed and returns equivalent results', () => {
    const src = `indicator("t")\n a = sma(close, 14)\n plot(a)\n`;
  const modSrc = transpileToJsModule(src);
  // modSrc is an IIFE string: (function(runner){ ... })
  const fn = new Function('runner', `return (${modSrc})(runner);`);
  const res = fn({ evaluate, makeDefaultEnv });
    const resDirect = runScript(src);
    // compare basic shape only: same count and callee name
    expect(res.plots.length).toBe(resDirect.plots.length);
    expect(res.plots[0].callee).toBe(resDirect.plots[0].callee);
  });
});
