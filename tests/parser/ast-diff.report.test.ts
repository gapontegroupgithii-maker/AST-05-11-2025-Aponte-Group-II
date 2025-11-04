import { it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { parse as handParse } from '../../src/lib/star-parser'

function normalize(o: any) { return JSON.parse(JSON.stringify(o, (k,v)=>{ if (k==='loc'||k==='location'||k==='start'||k==='end') return undefined; return v })) }
function normalizeExpr(e: any): any {
  if (e == null) return e;
  if (typeof e === 'number') return { type: 'Number', value: e };
  if (e.type === 'Number') return { type: 'Number', value: e.value };
  if (e.type === 'String') return { type: 'String', value: e.value };
  if (e.type === 'Identifier') return { type: 'Identifier', name: e.name };
  if (typeof e === 'string') return { type: 'Identifier', name: e };
  if (e.type === 'Call') return { type: 'Call', callee: e.callee || e.name, args: (e.args||[]).map(normalizeExpr) };
  if (e.type === 'Array') return { type: 'Array', items: (e.items||[]).map(normalizeExpr) };
  if (e.type === 'Index') return { type: 'Index', target: normalizeExpr(e.target || e.base || e.object), index: normalizeExpr(e.index) };
  if (e.type === 'Binary') return { type: 'Binary', op: e.op, left: normalizeExpr(e.left), right: normalizeExpr(e.right) };
  if (e.type === 'Unary') return { type: 'Unary', op: e.op, expr: normalizeExpr(e.expr) };
  return e;
}
function canonicalize(ast: any): any {
  if (!ast) return ast;
  if (ast.type === 'Program' && Array.isArray(ast.assignments)) {
    const assignments = ast.assignments.map((a: any) => ({ id: a.id || a.name, expr: normalizeExpr(a.expr || a.value) }));
    return { indicators: ast.indicators || [], assignments };
  }
  if (Array.isArray(ast.assignments)) {
    return { indicators: ast.indicators || [], assignments: ast.assignments.map((a: any) => ({ id: a.id, expr: normalizeExpr(a.expr) })) };
  }
  return ast;
}

async function loadGenParse() {
  const candidates = [
    path.resolve(__dirname, '../../src/lib/star-parser/parser.cjs'),
    path.resolve(__dirname, '../../src/lib/star-parser/parser.js'),
  ];
  const genPath = candidates.find(p => fs.existsSync(p));
  if (!genPath) return undefined as any;
  if (genPath.endsWith('.cjs')) {
    const req = createRequire(import.meta.url);
    const g = req(genPath);
    return g && (g.parse || (g.default && g.default.parse));
  }
  const g = await import(genPath);
  return g && (g.parse || (g.default && g.default.parse));
}

it('generate AST diff report for parser samples and write parser-diff.json', async () => {
  const genParse = await loadGenParse();
  const samples: string[] = [];
  // sample inline cases
  samples.push(`a = sma(close, 14)\n`);
  samples.push(`a = request.security(syminfo.tickerid, 'D', close)\n`);
  samples.push(`a = 1 + 2 * 3\n`);
  samples.push(`a = (1 + 2) * 3\n`);
  samples.push(`a = ta.hma(close, 12)[2]\n`);
  // also include files from tests/star-examples
  const examplesDir = path.resolve(__dirname, '../../tests/star-examples');
  if (fs.existsSync(examplesDir)) {
    const files = fs.readdirSync(examplesDir).filter(f => f.endsWith('.pine'));
    for (const f of files) samples.push(fs.readFileSync(path.join(examplesDir, f), 'utf8'));
  }

  const mismatches: any[] = [];
  for (const s of samples) {
    const h = handParse(s as any);
    if (!genParse) {
      // if no generated parser, skip (this test should not fail CI in that case)
      continue;
    }
    let gRaw: any;
    try { gRaw = genParse(s as any); } catch (err: any) { mismatches.push({ sample: s, error: (err && err.message) || String(err) }); continue; }
    let g = gRaw;
    try { const { adaptGeneratedProgram } = await import('../../src/lib/star-parser/gen-adapter'); g = adaptGeneratedProgram(gRaw); } catch (e) {}
    const H = canonicalize(normalize(h));
    const G = canonicalize(normalize(g));
    if (JSON.stringify(H) !== JSON.stringify(G)) {
      mismatches.push({ sample: s, hand: H, gen: G });
    }
  }

  const out = { timestamp: new Date().toISOString(), mismatches };
  fs.writeFileSync('parser-diff.json', JSON.stringify(out, null, 2));
  // fail when mismatches found
  if (mismatches.length > 0) {
    // throw to make Vitest fail the job and ensure artifact is uploaded by workflow
    throw new Error(`Parser AST mismatches found: ${mismatches.length}`);
  }
});
