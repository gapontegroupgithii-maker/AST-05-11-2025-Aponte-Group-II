import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'
import { parse as handParse } from '../../src/lib/star-parser'

function normalize(o: unknown) { return JSON.parse(JSON.stringify(o, (k,v)=>{ if (k==='loc'||k==='location'||k==='start'||k==='end') return undefined; return v })) }

function canonicalize(ast: unknown): unknown {
  if (!ast) return ast;
  if (ast.type === 'Program' && Array.isArray(ast.assignments)) {
    const assignments = ast.assignments.map((a: unknown) => ({ id: a.id || a.name, expr: normalizeExpr(a.expr || a.value) }));
    return { indicators: ast.indicators || [], assignments };
  }
  if (Array.isArray(ast.assignments)) {
    return { indicators: ast.indicators || [], assignments: ast.assignments.map((a: unknown) => ({ id: a.id, expr: normalizeExpr(a.expr) })) };
  }
  return ast;
}

function normalizeExpr(e: unknown): unknown {
  if (e == null) return e;
  if (typeof e === 'number') return { type: 'Number', value: e };
  if (e.type === 'Number') return { type: 'Number', value: e.value };
  if (e.type === 'String') return { type: 'String', value: e.value };
  if (e.type === 'Identifier') return { type: 'Identifier', name: e.name };
  if (typeof e === 'string') return { type: 'Identifier', name: e };
  if (e.type === 'Call') return { type: 'Call', callee: e.callee || e.name, args: (e.args||[]).map(normalizeExpr) };
  if (e.type === 'Array') return { type: 'Array', items: (e.items||[]).map(normalizeExpr) };
  if (e.type === 'Index') return { type: 'Index', target: normalizeExpr(e.target || e.base || e.object), index: normalizeExpr(e.index) };
  return e;
}

describe('generated parser compatibility (optional)', () => {
  const candidates = [
    path.resolve(__dirname, '../../src/lib/star-parser/parser.cjs'),
    path.resolve(__dirname, '../../src/lib/star-parser/parser.js'),
  ];
  const genPath = candidates.find(p => fs.existsSync(p));

  async function loadGenParse() {
    if (!genPath) return undefined as unknown;
    if (genPath.endsWith('.cjs')) {
      const req = createRequire(import.meta.url);
      const g = req(genPath);
      return g && (g.parse || (g.default && g.default.parse));
    }
    const g = await import(genPath);
    return g && (g.parse || (g.default && g.default.parse));
  }

  it('compares a handful of samples if generated parser exists', async () => {
    const genParse = await loadGenParse();
    if (!genParse) {
      expect(true).toBe(true);
      return;
    }
    const samples = [
      `a = sma(close, 14)\n`,
      `a = request.security(syminfo.tickerid, 'D', close)\n`,
      `a = [1,2,3]\n`,
      `a = "hello world"\n`,
    ];
    for (const s of samples) {
      const h = handParse(s as unknown);
      let gRaw: unknown;
      try {
        gRaw = genParse(s as unknown);
      } catch (err) {
        // If generated parser fails to parse, treat as mismatch and fail the test with the error message
        throw err;
      }
      // adapt generated AST shape into hand-parser shape for comparison
      let g = gRaw;
      try {
        const { adaptGeneratedProgram } = await import('../../src/lib/star-parser/gen-adapter');
        g = adaptGeneratedProgram(gRaw);
      } catch (e) {
        // if adapter missing, fall back to raw
      }
      expect(canonicalize(normalize(h))).toEqual(canonicalize(normalize(g)));
    }
  });
});
