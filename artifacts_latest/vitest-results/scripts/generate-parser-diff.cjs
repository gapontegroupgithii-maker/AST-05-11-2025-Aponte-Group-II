#!/usr/bin/env node
// scripts/generate-parser-diff.cjs
// Generates a diff JSON between the hand parser and the generated parser
// Usage: node scripts/generate-parser-diff.cjs

const fs = require('fs');
const path = require('path');

function safeRequire(p) {
  try {
    return require(p);
  } catch (e) {
    return null;
  }
}

// Try to load hand parser and generated parser
const handParser = safeRequire(path.resolve(__dirname, '../src/lib/star-parser/index.js')) || safeRequire(path.resolve(__dirname, '../src/lib/star-parser/index.cjs')) || safeRequire(path.resolve(__dirname, '../src/lib/star-parser/index.ts'));
const genParser = safeRequire(path.resolve(__dirname, '../src/lib/star-parser/parser.cjs')) || safeRequire(path.resolve(__dirname, '../src/lib/star-parser/parser.js'));

if (!handParser) {
  console.warn('Hand parser not found (src/lib/star-parser/index.*). Skipping diff.');
}
if (!genParser) {
  console.warn('Generated parser not found (src/lib/star-parser/parser.cjs). Skipping diff.');
}

// Load fixtures (use tests/parser inputs if available)
const fixturesDir = path.resolve(__dirname, '../tests/fixtures');
let fixtures = [];
if (fs.existsSync(fixturesDir)) {
  fixtures = fs.readdirSync(fixturesDir).filter(f => f.endsWith('.pine') || f.endsWith('.txt')).map(f => ({ name: f, src: fs.readFileSync(path.join(fixturesDir, f), 'utf8') }));
} else {
  // fallback: use a small sample
  fixtures = [{ name: 'sample1', src: 'a = 1\nplot(a)\n' }];
}

function normalizeAst(ast) {
  if (!ast) return ast;
  // If this is the generated parser shape (type: 'Program'), convert to a
  // hand-parser-like shape: { indicators: [], assignments: [{id, expr}, ...] }
  if (ast.type === 'Program' && Array.isArray(ast.assignments)) {
    const assignments = [];
    for (const item of ast.assignments) {
      if (!item) continue;
      if (item.type === 'Assignment') {
        assignments.push({ id: item.id, expr: normalizeExpr(item.expr) });
      } else if (item.type === 'Call') {
        // calls become an _call entry with expr the Call node
        assignments.push({ id: '_call', expr: normalizeExpr(item) });
      } else {
        // unknown item, try to keep it
        assignments.push(item);
      }
    }
    return { indicators: ast.indicators || [], assignments };
  }
  // If this already looks like a hand AST, normalize internals
  if (ast.assignments && Array.isArray(ast.assignments)) {
    return { indicators: ast.indicators || [], assignments: ast.assignments.map(a => ({ id: a.id, expr: normalizeExpr(a.expr) })) };
  }
  return ast;
}

function normalizeExpr(e) {
  if (!e) return e;
  if (Array.isArray(e)) return e.map(normalizeExpr);
  if (typeof e === 'string') return { type: 'Identifier', name: e };
  if (e.type === 'Call') {
    return { type: 'Call', callee: e.callee, args: (e.args || []).map(a => typeof a === 'string' ? { type: 'Identifier', name: a } : normalizeExpr(a)) };
  }
  if (e.type === 'Index') {
    return { type: 'Index', target: normalizeExpr(e.target), index: normalizeExpr(e.index) };
  }
  if (e.type === 'Array') {
    return { type: 'Array', items: (e.items || []).map(normalizeExpr) };
  }
  if (e.type === 'Identifier') return { type: 'Identifier', name: e.name };
  if (e.type === 'Number') return { type: 'Number', value: e.value };
  if (e.type === 'String') return { type: 'String', value: e.value };
  if (e.type === 'Unary') return { type: 'Unary', op: e.op || e.operator, expr: normalizeExpr(e.expr || e.argument) };
  if (e.type === 'Binary') return { type: 'Binary', op: e.op || e.operator, left: normalizeExpr(e.left), right: normalizeExpr(e.right) };
  // fallback: return as-is
  return e;
}

const diffs = [];
for (const fx of fixtures) {
  let handAst = null;
  let genAst = null;
  try { if (handParser && handParser.parse) handAst = handParser.parse(fx.src); } catch (e) { handAst = { error: String(e) }; }
  try { if (genParser && genParser.parse) genAst = genParser.parse(fx.src); } catch (e) { genAst = { error: String(e) }; }
  // normalize both ASTs to comparable canonical shapes
  const handNorm = handAst && !handAst.error ? normalizeAst(handAst) : handAst;
  const genNorm = genAst && !genAst.error ? normalizeAst(genAst) : genAst;
  diffs.push({ name: fx.name, hand: handNorm, gen: genNorm });
}

const out = { generatedAt: new Date().toISOString(), diffs };
const outPath = path.resolve(__dirname, '../parser-diff.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote parser-diff.json ->', outPath);

// Determine if any meaningful diffs exist. A simple heuristic: if either parser
// produced an error for a fixture, or the JSON representation differs.
let anyDiff = false;
for (const d of diffs) {
  if (!d.hand || !d.gen) { anyDiff = true; break; }
  if (d.hand.error || d.gen.error) { anyDiff = true; break; }
  // JSON stringify compare (simple structural check). If generated parser
  // intentionally has different shape this will count as a diff.
  try {
    const h = JSON.stringify(d.hand);
    const g = JSON.stringify(d.gen);
    if (h !== g) { anyDiff = true; break; }
  } catch (e) {
    anyDiff = true; break;
  }
}

if (anyDiff) {
  console.error('Parser diff detected. Failing (fail-on-diff enabled). See parser-diff.json for details.');
  process.exit(2);
} else {
  console.log('No parser diffs detected.');
  process.exit(0);
}
