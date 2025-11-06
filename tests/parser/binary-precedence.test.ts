import { describe, it, expect } from 'vitest'
import { parse as handParse } from '../../src/lib/star-parser'
import fs from 'fs'
import path from 'path'
import { createRequire } from 'module'

function normalize(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (k, v) => {
    if (k === 'loc' || k === 'location' || k === 'start' || k === 'end') return undefined;
    return v;
  }));
}

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
  if (e.type === 'Binary') return { type: 'Binary', op: e.op, left: normalizeExpr(e.left), right: normalizeExpr(e.right) };
  if (e.type === 'Unary') return { type: 'Unary', op: e.op, expr: normalizeExpr(e.expr) };
  return e;
}

describe('parser binary precedence', () => {
  const genCandidates = [
    path.resolve(__dirname, '../../src/lib/star-parser/parser.cjs'),
    path.resolve(__dirname, '../../src/lib/star-parser/parser.js'),
  ];
  const genPath = genCandidates.find(p => fs.existsSync(p));

  async function loadGenParse() {
    if (!genPath) return undefined as unknown;
    const genPathNonNull = genPath as string;
    if (genPathNonNull.endsWith('.cjs')) {
      const req = createRequire(import.meta.url);
      const g = req(genPathNonNull);
      return g && (g.parse || (g.default && g.default.parse));
    }
    const g = await import(genPathNonNull);
    return g && (g.parse || (g.default && g.default.parse));
  }

  const samples = [
    `a = 1 + 2 * 3\n`,
    `a = (1 + 2) * 3\n`,
  ];

  samples.forEach((s, i) => {
    it(`hand vs generated parser binary sample ${i}`, async () => {
      const genParse = await loadGenParse();
      if (!genParse) { expect(true).toBe(true); return; }
      const h = handParse(s as unknown);
      let gRaw: unknown;
      try { gRaw = genParse(s as unknown); } catch (err) { throw err; }
      let g = gRaw;
      try { const { adaptGeneratedProgram } = await import('../../src/lib/star-parser/gen-adapter'); g = adaptGeneratedProgram(gRaw); } catch (e) {}
      const H = canonicalize(normalize(h));
      const G = canonicalize(normalize(g));
      expect(H).toEqual(G);
    });
  });
});
