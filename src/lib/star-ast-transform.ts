// Simple transformer: Pine AST -> Star AST (basic mapping)
// This transformer is intentionally permissive: it accepts the lightweight
// AST shape produced by the test parser shim and normalizes callees into the
// `star.*` namespace for downstream code.

// Use `any` types here to avoid tight coupling with parser types during
// incremental development. The runtime behavior is what matters for tests.
export function transformProgram(ast: unknown): unknown {
  const out: unknown = { version: ast.version ?? null, indicators: Array.isArray(ast.indicators) ? [...ast.indicators] : [], assignments: [] };
  for (const a of ast.assignments || []) {
    out.assignments.push({ id: a.id, expr: transformExpression(a.expr) });
  }
  return out;
}

function transformExpression(expr: unknown): unknown {
  if (!expr || typeof expr !== 'object') return expr;
  const t = expr.type;

  if (t === 'Call') {
    let callee = expr.callee || expr.name || '';
    callee = normalizeCallee(callee);
    const args = (expr.args || []).map(transformExpression);
    return { type: 'Call', callee, args };
  }

  if (t === 'Array') {
    return { type: 'Array', items: (expr.items || []).map(transformExpression) };
  }

  if (t === 'Index') {
    // parser shim uses { target: { type: 'Identifier', name }, index } shape
    const target = expr.target || expr.base || expr.object;
    return { type: 'Index', target: transformExpression(target), index: transformExpression(expr.index) };
  }

  if (t === 'Binary') {
    return { type: 'Binary', operator: expr.operator, left: transformExpression(expr.left), right: transformExpression(expr.right) };
  }

  // Identifier / Number / String / others: return normalized leaf
  if (t === 'Identifier') return { type: 'Identifier', name: expr.name ?? expr };
  if (t === 'Number') return { type: 'Number', value: expr.value ?? expr };
  if (t === 'String') return { type: 'String', value: expr.value ?? expr };

  return expr;
}

function normalizeCallee(callee: string): string {
  if (!callee || typeof callee !== 'string') return callee;
  // direct mappings
  if (callee === 'plot') return 'star.plot';
  // input can be `input` or `input.string` etc.
  if (callee === 'input' || callee.startsWith('input')) return 'star.' + callee;
  if (callee.startsWith('ta.')) return 'star.' + callee;
  if (callee.startsWith('request.')) return 'star.' + callee;
  // if already namespaced (e.g. star.*) keep as-is
  if (callee.startsWith('star.')) return callee;
  // fallback: keep original but prefer star.* prefix for common libs
  // map common built-in TA functions to star.ta.<fn>
  const taBuiltins = new Set(['sma','ema','rsi','wma','ma','stdev','sum','avg','max','min']);
  if (taBuiltins.has(callee)) return `star.ta.${callee}`;

  return callee;
}
