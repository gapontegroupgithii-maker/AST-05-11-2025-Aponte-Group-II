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

function renderExpr(e: any): string {
  if (!e) return '';
  if (e.type === 'Call') {
    const args = (e.args || []).map(renderExpr).join(', ');
    return `${e.callee}(${args})`;
  }
  if (e.type === 'Identifier') return e.name;
  if (e.type === 'Number') return String(e.value);
  if (e.type === 'String') return JSON.stringify(e.value);
  if (e.type === 'Array') return `[${(e.items||[]).map(renderExpr).join(', ')}]`;
  if (e.type === 'Binary') return `${renderExpr(e.left)} ${e.operator || e.op || e.operator} ${renderExpr(e.right)}`;
  return JSON.stringify(e);
}

export default { transpilePineToStar };
