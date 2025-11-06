#!/usr/bin/env node
// scripts/generate-parser-report.cjs
// Reads parser-diff.json and emits a human-friendly Markdown report parser-diff-report.md

const fs = require('fs');
const path = require('path');

const inPath = path.resolve(__dirname, '../parser-diff.json');
const outPath = path.resolve(__dirname, '../parser-diff-report.md');

if (!fs.existsSync(inPath)) {
  console.error('parser-diff.json not found. Run scripts/generate-parser-diff.cjs first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(inPath, 'utf8'));
let md = `# Parser Diff Report\n\nGenerated: ${data.generatedAt}\n\n`;

for (const d of data.diffs || []) {
  md += `## Fixture: ${d.name}\n\n`;
  if (d.hand && d.hand.error) {
    md += `- Hand parser error: \`${d.hand.error}\`\n\n`;
  }
  if (d.gen && d.gen.error) {
    md += `- Generated parser error: \`${d.gen.error}\`\n\n`;
  }
  md += `### Hand AST\n\n`;
  md += '```json\n' + JSON.stringify(d.hand, null, 2) + '\n```\n\n';
  md += `### Generated AST\n\n`;
  md += '```json\n' + JSON.stringify(d.gen, null, 2) + '\n```\n\n';
  // Quick semantic note: if shapes differ, call out keys
  const handKeys = d.hand ? Object.keys(d.hand) : [];
  const genKeys = d.gen ? Object.keys(d.gen) : [];
  const onlyHand = handKeys.filter(k => !genKeys.includes(k));
  const onlyGen = genKeys.filter(k => !handKeys.includes(k));
  if (onlyHand.length || onlyGen.length) {
    md += `### Structural differences summary\n\n`;
    if (onlyHand.length) md += `- Keys only in hand AST: ${onlyHand.join(', ')}\n`;
    if (onlyGen.length) md += `- Keys only in generated AST: ${onlyGen.join(', ')}\n`;
    md += '\n';
  }
}

fs.writeFileSync(outPath, md, 'utf8');
console.log('Wrote parser-diff-report.md ->', outPath);
