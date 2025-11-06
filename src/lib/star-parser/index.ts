// Minimal hand-written parser shim used by tests.
// Purpose: provide a small, forgiving parser that returns a lightweight AST
// shape used by transformer and parser tests. This is not a full parser —
// it's a pragmatic scaffold so the test suite can run in this branch.

export type Program = {
  indicators?: unknown[];
  assignments: Array<{ id: string; expr: unknown }>;
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
  // split args on top-level commas (ignore commas inside parentheses)
  function splitTopLevelComma(s: string) {
    const parts: string[] = [];
    let buf = '';
    let depth = 0;
    for (let i = 0; i < s.length; i++) {
      const ch = s[i];
      if (ch === '(') {
        depth++;
        buf += ch;
        continue;
      }
      if (ch === ')') {
        depth = Math.max(0, depth - 1);
        buf += ch;
        continue;
      }
      if (ch === ',' && depth === 0) {
        parts.push(buf.trim());
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts.filter(Boolean);
  }

  const rawParts = splitTopLevelComma(argsRaw);
  const args: unknown[] = [];
  for (const a of rawParts) {
    const named = a.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/s);
    if (named) {
      const name = named[1];
      const rest = named[2].trim();
      // push name as Identifier then the value node
      args.push({ type: 'Identifier', name });
      if (/^\d+(?:\.\d+)?$/.test(rest)) args.push(parseNumber(rest));
      else if ((rest.startsWith('"') && rest.endsWith('"')) || (rest.startsWith("'") && rest.endsWith("'"))) args.push(parseString(rest));
      else {
        const idx = rest.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*(\d+)\s*\]$/);
        if (idx) args.push({ type: 'Index', target: { type: 'Identifier', name: idx[1] }, index: parseNumber(idx[2]) });
        else {
          // try to parse as expression (handles calls like color.rgb(...))
          try {
            const tokens = tokenizeExpr(rest);
            const parsed = parseExpressionTokens(tokens, { pos: 0 });
            args.push(parsed);
          } catch (e) {
            args.push({ type: 'Identifier', name: parseIdentifier(rest) });
          }
        }
      }
      continue;
    }
    const aToken = a;
    if (/^\d+(?:\.\d+)?$/.test(aToken)) args.push(parseNumber(aToken));
    else if ((aToken.startsWith('"') && aToken.endsWith('"')) || (aToken.startsWith("'") && aToken.endsWith("'"))) args.push(parseString(aToken));
    else {
      const idx = aToken.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\[\s*(\d+)\s*\]$/);
      if (idx) args.push({ type: 'Index', target: { type: 'Identifier', name: idx[1] }, index: parseNumber(idx[2]) });
      else if (aToken.includes('(') || aToken.includes('[') || aToken.includes('+') || aToken.includes('-') || aToken.includes('*') || aToken.includes('/')) {
        try {
          const tokens = tokenizeExpr(aToken);
          const parsed = parseExpressionTokens(tokens, { pos: 0 });
          args.push(parsed);
        } catch (e) {
          args.push({ type: 'Identifier', name: parseIdentifier(aToken) });
        }
      } else args.push({ type: 'Identifier', name: parseIdentifier(aToken) });
    }
  }
  return { type: 'Call', callee, args };
}

// --- small expression parser used by hand-written parser ---
type Token = { type: string; value: unknown };

function tokenizeExpr(s: string): Token[] {
  const tokens: Token[] = [];
  const re = /\s*(?:([0-9]+(?:\.[0-9]+)?)|([a-zA-Z_][a-zA-Z0-9_\.]*)|("(?:\\.|[^\\"])*")|('(\\.|[^\\'])*')|(\+|\-|\*|\/|\^|\(|\)|\[|\]|,))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    if (m[1]) tokens.push({ type: 'Number', value: parseFloat(m[1]) });
    else if (m[2]) tokens.push({ type: 'Identifier', value: m[2] });
    else if (m[3]) tokens.push({ type: 'String', value: m[3] });
    else if (m[4]) tokens.push({ type: 'String', value: m[4] });
    else if (m[6]) tokens.push({ type: 'Punct', value: m[6] });
  }
  return tokens;
}

function parseExpressionTokens(tokens: Token[], posRef: { pos: number }): unknown {
  // recursive descent with precedence
  function parsePrimary(): unknown {
    const p = posRef.pos;
    const t = tokens[p];
    if (!t) return null;
    if (t.type === 'Number') { posRef.pos++; return { type: 'Number', value: t.value }; }
    if (t.type === 'String') { posRef.pos++; const raw = t.value; const unq = raw.startsWith("'") || raw.startsWith('"') ? raw.slice(1, -1) : raw; return { type: 'String', value: unq.replace(/\\n/g,'\n').replace(/\\'/g, "'").replace(/\\\"/g,'"') }; }
    if (t.type === 'Identifier') {
      // could be function call or dotted path or identifier
      posRef.pos++;
      let name = t.value;
      // handle dotted identifiers already included in token
      let node: unknown = { type: 'Identifier', name };
      // function call
      if (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === '(') {
        // parse args
        posRef.pos++; // consume '('
        const args: unknown[] = [];
        while (tokens[posRef.pos] && !(tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === ')')) {
          const arg = parseExpressionTokens(tokens, posRef);
          if (arg !== undefined) args.push(arg);
          if (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === ',') posRef.pos++;
        }
        if (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === ')') posRef.pos++;
        node = { type: 'Call', callee: name, args };
      }
      // handle postfix indexing chain
      while (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === '[') {
        posRef.pos++; // consume '['
        const idx = parseExpressionTokens(tokens, posRef);
        if (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === ']') posRef.pos++;
        node = { type: 'Index', target: node, index: idx };
      }
      return node;
    }
    if (t.type === 'Punct' && t.value === '(') {
      posRef.pos++;
      const e = parseExpressionTokens(tokens, posRef);
      if (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === ')') posRef.pos++;
      return e;
    }
    return null;
  }

  function parseUnary(): unknown {
    const t = tokens[posRef.pos];
    if (t && t.type === 'Punct' && (t.value === '+' || t.value === '-')) {
      posRef.pos++;
      const expr = parseUnary();
      return { type: 'Unary', op: t.value, expr };
    }
    return parsePrimary();
  }

  function parsePow(): unknown {
    let left = parseUnary();
    while (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && tokens[posRef.pos].value === '^') {
      const op = tokens[posRef.pos].value; posRef.pos++;
      const right = parsePow();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  function parseMulDiv(): unknown {
    let left = parsePow();
    while (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && (tokens[posRef.pos].value === '*' || tokens[posRef.pos].value === '/')) {
      const op = tokens[posRef.pos].value; posRef.pos++;
      const right = parsePow();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  function parseAddSub(): unknown {
    let left = parseMulDiv();
    while (tokens[posRef.pos] && tokens[posRef.pos].type === 'Punct' && (tokens[posRef.pos].value === '+' || tokens[posRef.pos].value === '-')) {
      const op = tokens[posRef.pos].value; posRef.pos++;
      const right = parseMulDiv();
      left = { type: 'Binary', op, left, right };
    }
    return left;
  }

  return parseAddSub();
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
      let expr: unknown = null;
      // try to parse expression tokens
      try {
        const tokens = tokenizeExpr(rhs);
        const posRef = { pos: 0 };
        expr = parseExpressionTokens(tokens, posRef);
        if (!expr) {
          // fallback to simple parsing
          if ((rhs.startsWith('"') && rhs.endsWith('"')) || (rhs.startsWith("'") && rhs.endsWith("'"))) {
            expr = parseString(rhs);
          } else if (/^\d+(?:\.\d+)?$/.test(rhs)) {
            expr = parseNumber(rhs);
          } else if (rhs.startsWith('[') && rhs.endsWith(']')) {
            expr = parseArray(rhs);
          } else {
            expr = { type: 'Identifier', name: rhs };
          }
        }
      } catch (e) {
        // if expression parsing fails, fallback to previous behavior
        if ((rhs.startsWith('"') && rhs.endsWith('"')) || (rhs.startsWith("'") && rhs.endsWith("'"))) {
          expr = parseString(rhs);
        } else if (/^\d+(?:\.\d+)?$/.test(rhs)) {
          expr = parseNumber(rhs);
        } else if (rhs.startsWith('[') && rhs.endsWith(']')) {
          expr = parseArray(rhs);
        } else {
          const c = parseCall(rhs);
          expr = c || { type: 'Unknown', raw: rhs };
        }
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
