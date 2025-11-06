#!/usr/bin/env node
// scripts/generate-parser-diff.js
// Generates a diff JSON between the hand parser and the generated parser
// Usage: node scripts/generate-parser-diff.js

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

const diffs = [];
for (const fx of fixtures) {
  let handAst = null;
  let genAst = null;
  try { if (handParser && handParser.parse) handAst = handParser.parse(fx.src); } catch (e) { handAst = { error: String(e) }; }
  try { if (genParser && genParser.parse) genAst = genParser.parse(fx.src); } catch (e) { genAst = { error: String(e) }; }
  diffs.push({ name: fx.name, hand: handAst, gen: genAst });
}

const out = { generatedAt: new Date().toISOString(), diffs };
const outPath = path.resolve(__dirname, '../parser-diff.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');
console.log('Wrote parser-diff.json ->', outPath);
