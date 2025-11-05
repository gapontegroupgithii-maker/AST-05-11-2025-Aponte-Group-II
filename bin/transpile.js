#!/usr/bin/env node
// Simple CLI to transpile Pine-like source to Star text or to an executable JS module.
const fs = require('fs');
const path = require('path');
const args = process.argv.slice(2);
let infile = null;
let outStar = null;
let outModule = null;
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--in' || a === '-i') infile = args[++i];
  else if (a === '--out-star') outStar = args[++i];
  else if (a === '--out-module') outModule = args[++i];
}
if (!infile) {
  console.error('Usage: transpile --in file.pine [--out-star file.star] [--out-module file.js]');
  process.exit(2);
}
const src = fs.readFileSync(infile, 'utf8');
// load transpiler (ESM import not possible easily here), so require the built file
const transpiler = require(path.join(__dirname, '..', 'src', 'lib', 'star-transpiler'));
if (outStar) {
  const out = transpiler.transpilePineToStar(src);
  fs.writeFileSync(outStar, out, 'utf8');
  console.log('Wrote star source to', outStar);
}
if (outModule) {
  const mod = transpiler.transpileToJsModule(src);
  fs.writeFileSync(outModule, mod, 'utf8');
  console.log('Wrote JS module to', outModule);
}
if (!outStar && !outModule) {
  // default: print star
  process.stdout.write(transpiler.transpilePineToStar(src));
}
