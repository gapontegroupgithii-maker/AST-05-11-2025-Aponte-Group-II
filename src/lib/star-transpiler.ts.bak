// star-transpiler.ts
// Minimal transpiler scaffold: converts Pine-like source into Star source
// using simple regex/AST heuristics for Phase 1 MVP.

import { parse as handParse } from './star-parser';
import { transformProgram } from './star-ast-transform';

export function transpilePineToStar(source: string): string {
  // For MVP: parse with hand parser then map calls via transformProgram
  const ast = handParse(source as any);
  const t = transformProgram(ast as any);
  // naive rendering: emit assignments back to textual form using star.* names
  const lines: string[] = [];
  for (const a of t.assignments || []) {
    if (a.id === '_call') {
      // call side-effects like plot
      const c = a.expr;
      const args = (c.args || []).map((x: any) => renderExpr(x)).join(', ');
      lines.push(`${c.callee}(${args})`);
      continue;
    }
    lines.push(`${a.id} = ${renderExpr(a.expr)}`);
  }
  return lines.join('\n');
}

// Emit a tiny CommonJS module (string) that, when executed with `require`, will
// call the runtime runner and return the RunResult. This is useful for testing
// the transpiled output end-to-end without writing files.
export function transpileToJsModule(source: string): string {
  // For robust execution we embed the transformed AST (not textual star).
  // This allows the generated module to be executed by providing a runtime
  // object with `evaluate` and `makeDefaultEnv`.
  const progAst = transformProgram((handParse as any)(source as any) as any);
  const astJson = JSON.stringify(progAst).replace(/\\/g, '\\\\').replace(/`/g, '\\`');
  return `(function(runtime){\n  const prog = JSON.parse(` + '`' + `${astJson}` + '`' + `);\n  const env = runtime.makeDefaultEnv();\n  env.star = { plot: env.plot, ta: env.ta, request: env.request, input: env.input, math: env.math, color: env.color, strategy: env.strategy };\n  for (const a of prog.assignments || []) {\n    if (a.id === '_call') { runtime.evaluate(a.expr, env); continue; }\n    env[a.id] = runtime.evaluate(a.expr, env);\n  }\n  return { env, plots: env.plots || [] };\n})`;
}

function renderExpr(e: any): string {
  if (!e) return '';
  if (e.type === 'Call') {
    // support named args encoded as Identifier followed by a value
    const rawArgs = e.args || [];
    const posArgs: any[] = [];
    const named: Record<string, any> = {};
    for (let i = 0; i < rawArgs.length; i++) {
      const a = rawArgs[i];
      const next = rawArgs[i + 1];
      if (a && a.type === 'Identifier' && next !== undefined && next.type !== 'Identifier') {
        // treat as name=value pair
        named[a.name] = next;
        i++; // skip next
        continue;
      }
      posArgs.push(a);
    }
    const parts: string[] = posArgs.map(renderExpr);
    if (Object.keys(named).length) {
      const objParts = Object.entries(named).map(([k, v]) => `${k}: ${renderExpr(v)}`);
      parts.push(`{ ${objParts.join(', ')} }`);
    }
    return `${e.callee}(${parts.join(', ')})`;
  }
  if (e.type === 'Identifier') return e.name;
  if (e.type === 'Number') return String(e.value);
  if (e.type === 'String') return JSON.stringify(e.value);
  if (e.type === 'Array') return `[${(e.items||[]).map(renderExpr).join(', ')}]`;
  if (e.type === 'Index') return `${renderExpr(e.target)}[${renderExpr(e.index)}]`;
  if (e.type === 'Unary') return `${e.op || e.operator || '-'}${renderExpr(e.expr || e.argument)}`;
  if (e.type === 'Binary') return `${renderExpr(e.left)} ${e.operator || e.op || e.operator} ${renderExpr(e.right)}`;
  return JSON.stringify(e);
}

export default { transpilePineToStar, transpileToJsModule };
