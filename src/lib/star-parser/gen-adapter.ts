// Adapter to convert a generated parser AST (from Peggy) into the hand-parser
// shaped AST used by the codebase. This allows generated parsers to be
// compared/used without forcing exact internal shapes to match.

export function adaptGeneratedProgram(ast: any): any {
  if (!ast) return ast;
  if (ast.type === 'Program' && Array.isArray(ast.assignments)) {
    const assignments = ast.assignments.map((a: any) => {
      const id = a.id || a.name;
      return { id, expr: adaptExpr(a.expr || a.value) };
    });
    return { indicators: ast.indicators || [], assignments };
  }
  return ast;
}

function adaptExpr(e: any): any {
  if (e == null) return e;
  // unwrap array wrappers produced by the generated parser (groups/sequence)
  if (Array.isArray(e)) {
    // try to find a meaningful element (object node) inside the array
    for (const el of e) {
      if (el && typeof el === 'object' && (el.type || el.callee || el.name)) return adaptExpr(el);
    }
    // fallback: join string parts into identifier-like
    const parts = e.filter((x: any) => typeof x === 'string').join('');
    return parts ? { type: 'Identifier', name: parts } : e;
  }
  if (typeof e === 'number') return { type: 'Number', value: e };
  if (e.type === 'Number') return { type: 'Number', value: e.value };
  if (e.type === 'String') return { type: 'String', value: e.value };
  if (typeof e === 'string') return { type: 'Identifier', name: e };
  if (e.type === 'Identifier') return { type: 'Identifier', name: e.name };
  if (e.type === 'Binary') return { type: 'Binary', op: e.op || e.operator || e.name, left: adaptExpr(e.left), right: adaptExpr(e.right) };
  if (e.type === 'Unary') return { type: 'Unary', op: e.op || e.operator || e.name, expr: adaptExpr(e.expr || e.argument) };
  if (e.type === 'Call') return { type: 'Call', callee: e.callee || e.name, args: (e.args||[]).map(adaptExpr) };
  if (e.type === 'Array') return { type: 'Array', items: (e.items||[]).map(adaptExpr) };
  if (e.type === 'Index') return { type: 'Index', target: adaptExpr(e.target || e.base || e.object), index: adaptExpr(e.index) };
  return e;
}

export default adaptGeneratedProgram;
