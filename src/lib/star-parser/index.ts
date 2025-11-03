// Minimal hand-written parser shim used by tests.
// Purpose: provide a small, forgiving parser that returns a lightweight AST
// shape used by transformer and parser tests. This is not a full parser —
// it's a pragmatic scaffold so the test suite can run in this branch.

export type Program = {
  indicators?: any[];
  assignments: Array<{ id: string; expr: any }>;
};

function trim(s: string) { return s.trim(); }

function parseIdentifier(tok: string) {
  return tok.trim();
}

function parseNumber(tok: string) {
  const n = Number(tok);
  return { type: 'Number', value: isNaN(n) ? tok : n };
}

function parseString(tok: string) {
  // remove wrapping quotes if any and unescape simple sequences
  let inner = tok.trim();
  if ((inner.startsWith('"') && inner.endsWith('"')) || (inner.startsWith("'") && inner.endsWith("'"))) {
    inner = inner.slice(1, -1);
    inner = inner.replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\n/g, '\n');
  }
  return { type: 'String', value: inner };
}

function parseArray(tok: string) {
  const inner = tok.trim();
  const without = inner.replace(/^\[|\]$/g, '');
  const parts = without.split(',').map(p => p.trim()).filter(Boolean);
  const items = parts.map(p => {
    if (/^\d+(?:\.\d+)?$/.test(p)) return parseNumber(p);
    if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) return parseString(p);
    return { type: 'Identifier', name: parseIdentifier(p) };
  });
  return { type: 'Array', items };
}

function parseCall(text: string) {
  // naive: match callee(args)
  const m = text.match(/^([a-zA-Z0-9_\.]+)\s*\((.*)\)$/s);
  if (!m) return null;
  const callee = m[1];
  const argsRaw = m[2].trim();
  if (argsRaw === '') return { type: 'Call', callee, args: [] };
  // split args on commas naively (no nested handling)
  const args = argsRaw.split(',').map(a => a.trim()).filter(Boolean).map(a => {
    if (/^\d+(?:\.\d+)?$/.test(a)) return parseNumber(a);
    if ((a.startsWith('"') && a.endsWith('"')) || (a.startsWith("'") && a.endsWith("'"))) return parseString(a);
    // indexing inside arg e.g. close[12]
    const idx = a.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*(\d+)\s*\]$/);
    if (idx) return { type: 'Index', target: { type: 'Identifier', name: idx[1] }, index: parseNumber(idx[2]) };
    return { type: 'Identifier', name: parseIdentifier(a) };
  });
  return { type: 'Call', callee, args };
}

export function parse(input: string): Program {
  const lines = input.split(/\r?\n/);
  const program: Program = { indicators: [], assignments: [] };

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('//') || line.startsWith('/*')) continue;
    // indicator
    if (line.startsWith('indicator')) {
      program.indicators!.push(line);
      continue;
    }
    // assignment
    const assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/s);
    if (assignMatch) {
      const id = assignMatch[1];
      const rhs = assignMatch[2].trim();
      let expr: any = null;
      // string
      if ((rhs.startsWith('"') && rhs.endsWith('"')) || (rhs.startsWith("'") && rhs.endsWith("'"))) {
        expr = parseString(rhs);
      } else if (/^\d+(?:\.\d+)?$/.test(rhs)) {
        expr = parseNumber(rhs);
      } else if (rhs.startsWith('[') && rhs.endsWith(']')) {
        expr = parseArray(rhs);
      } else if (/^[a-zA-Z0-9_\.]+\s*\(/.test(rhs)) {
        const c = parseCall(rhs);
        expr = c || { type: 'Unknown', raw: rhs };
      } else if (/^[a-zA-Z_][a-zA-Z0-9_]*\s*\[\s*\d+\s*\]$/.test(rhs)) {
        const m = rhs.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*(\d+)\s*\]$/);
        expr = { type: 'Index', target: { type: 'Identifier', name: m![1] }, index: parseNumber(m![2]) };
      } else {
        expr = { type: 'Identifier', name: rhs };
      }
      program.assignments.push({ id, expr });
      continue;
    }
    // bare call like plot(a)
    const call = parseCall(line);
    if (call) {
      // represent as assignment to special _ lastCall for simplicity
      program.assignments.push({ id: '_call', expr: call });
      continue;
    }
    // fallback: ignore
  }

  return program;
}

export default { parse };
