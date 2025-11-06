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
  // prefer showing raw errors if present
  if (d.handRaw && d.handRaw.error) {
    md += `- Hand parser error (raw): \`${d.handRaw.error}\`\n\n`;
  }
  if (d.genRaw && d.genRaw.error) {
    md += `- Generated parser error (raw): \`${d.genRaw.error}\`\n\n`;
  }

  md += `### Hand AST (raw)\n\n`;
  md += '```json\n' + JSON.stringify(d.handRaw || d.hand, null, 2) + '\n```\n\n';

  md += `### Generated AST (raw)\n\n`;
  md += '```json\n' + JSON.stringify(d.genRaw || d.gen, null, 2) + '\n```\n\n';

  md += `### Hand AST (normalized)\n\n`;
  md += '```json\n' + JSON.stringify(d.hand, null, 2) + '\n```\n\n';

  md += `### Generated AST (normalized)\n\n`;
  md += '```json\n' + JSON.stringify(d.gen, null, 2) + '\n```\n\n';

  // Quick semantic note: if normalized shapes differ, call out keys
  const handKeys = d.hand ? Object.keys(d.hand) : [];
  const genKeys = d.gen ? Object.keys(d.gen) : [];
  const onlyHand = handKeys.filter(k => !genKeys.includes(k));
  const onlyGen = genKeys.filter(k => !handKeys.includes(k));
  if (onlyHand.length || onlyGen.length) {
    md += `### Structural differences summary (normalized)\n\n`;
    if (onlyHand.length) md += `- Keys only in hand AST: ${onlyHand.join(', ')}\n`;
    if (onlyGen.length) md += `- Keys only in generated AST: ${onlyGen.join(', ')}\n`;
    md += '\n';
  }
}

fs.writeFileSync(outPath, md, 'utf8');
console.log('Wrote parser-diff-report.md ->', outPath);
