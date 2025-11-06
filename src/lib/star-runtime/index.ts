// Minimal runtime/evaluator for Star AST nodes used in Phase3 scaffolding.
// Purpose: provide a tiny, well-tested evaluator to execute simple AST
// produced by the parser (Number, String, Identifier, Binary, Unary, Call,
// Array, Index). This is intentionally small — only core helpers are included.

export type RuntimeEnv = Record<string, unknown>;

function resolvePath(env: RuntimeEnv, path: string) {
  const parts = path.split('.');
  let cur: unknown = env;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

export function evaluate(node: unknown, env: RuntimeEnv = {}): unknown {
  // simple operation budget guard
  env._opCount = env._opCount || 0;
  const opLimit = env._opLimit || 1000000;
  env._opCount += 1;
  if (env._opCount > opLimit) throw new Error(`Runtime exceeded operation limit (${opLimit})`);

  if (node == null) return node;
  switch (node.type) {
    case 'Number':
      return node.value;
    case 'String':
      return node.value;
    case 'Identifier': {
      const n = node.name;
      if (n === 'true') return true;
      if (n === 'false') return false;
      // try dotted lookup
      const v = resolvePath(env, n);
      return v !== undefined ? v : n;
    }
    case 'Binary': {
      const l = evaluate(node.left, env);
      const r = evaluate(node.right, env);
      switch (node.op) {
        case '+': return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '^': return Math.pow(l, r);
        default: throw new Error(`Unsupported binary op ${node.op}`);
      }
    }
    case 'Unary': {
      const v = evaluate(node.expr, env);
      switch (node.op) {
        case '+': return +v;
        case '-': return -v;
        default: throw new Error(`Unsupported unary op ${node.op}`);
      }
    }
    case 'Call': {
      const callee = typeof node.callee === 'string' ? node.callee : (node.callee?.name || node.callee);
      const fn = resolvePath(env, callee);
      const args = (node.args || []).map((a: unknown) => evaluate(a, env));
      if (typeof fn === 'function') return fn(...args);
      // fallback: return representation
      return { callee, args };
    }
    case 'Array':
      return (node.items || []).map((i: unknown) => evaluate(i, env));
    case 'Index': {
      const target = evaluate(node.target, env);
      const idx = evaluate(node.index, env);
      return target?.[idx];
    }
    default:
      throw new Error(`Runtime does not support node type: ${node.type}`);
  }
}

export default { evaluate };
