#!/usr/bin/env node
// scripts/replace-any-to-unknown.js
// Simple codemod: replace explicit `any` with `unknown` in TypeScript source files.
// It makes a best-effort set of regex replacements and writes files in-place.
// Usage: node scripts/replace-any-to-unknown.js

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const includeDirs = ['src', 'tests', 'scripts', 'lib', 'pages', 'components', 'utils', 'store'];
const excludePatterns = ['node_modules', '.git', 'artifacts_latest', 'dist', 'public', 'backups', 'vitest-results'];
const exts = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts'];

function shouldSkip(filePath) {
  return excludePatterns.some(p => filePath.includes(path.sep + p + path.sep) || filePath.endsWith(path.sep + p));
}

function walk(dir) {
  const results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const d of list) {
    const full = path.join(dir, d.name);
    if (shouldSkip(full)) continue;
    if (d.isDirectory()) {
      results.push(...walk(full));
    } else if (exts.includes(path.extname(d.name))) {
      results.push(full);
    }
  }
  return results;
}

function processFile(filePath) {
  let src = fs.readFileSync(filePath, 'utf8');
  let orig = src;

  // Replace patterns. These are heuristic and conservative.
  // 1) Type annotations: ": unknown" -> ": unknown"
  src = src.replace(/:\s*any(\b|\s|;|,|\))/g, (m, g1) => `: unknown${g1}`);
  // 2) "as unknown" -> "as unknown"
  src = src.replace(/as\s+any\b/g, 'as unknown');
  // 3) Generic <unknown> -> <unknown>
  src = src.replace(/<\s*any\s*>/g, '<unknown>');
  // 4) Array<unknown> -> Array<unknown>
  src = src.replace(/Array<\s*any\s*>/g, 'Array<unknown>');
  // 5) Record<K, unknown> -> Record<K, unknown>
  src = src.replace(/Record<([^,>]+),\s*any\s*>/g, 'Record<$1, unknown>');
  // 6) Tuple types like [unknown, unknown] -> [unknown, unknown]
  src = src.replace(/\[([^\]]*?)any([^\]]*?)\]/g, (m) => m.replace(/any/g, 'unknown'));

  // 7) edgecases: ": unknown" (no space) -> ": unknown"
  src = src.replace(/:\s*unknown/g, ': unknown'); // normalize spacing

  if (src !== orig) {
    // Backup original
    try {
      fs.copyFileSync(filePath, filePath + '.bak');
    } catch (e) {
      // ignore
    }
    fs.writeFileSync(filePath, src, 'utf8');
    return true;
  }
  return false;
}

const changed = [];
for (const d of includeDirs) {
  const dir = path.join(root, d);
  if (!fs.existsSync(dir)) continue;
  const files = walk(dir);
  for (const f of files) {
    try {
      const ok = processFile(f);
      if (ok) changed.push(f);
    } catch (e) {
      console.error('Error processing', f, e.message);
    }
  }
}

console.log('Files changed:', changed.length);
for (const c of changed) console.log(' -', c);

if (changed.length === 0) process.exit(0);
process.exit(0);
