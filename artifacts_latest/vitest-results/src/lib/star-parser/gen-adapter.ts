// Adapter to convert a generated parser AST (from Peggy) into the hand-parser
// shaped AST used by the codebase. This allows generated parsers to be
// compared/used without forcing exact internal shapes to match.

export function adaptGeneratedProgram(ast: any): any {
  if (!ast) return ast;
  if (ast.type === 'Program' && Array.isArray(ast.assignments)) {
    const indicators: any[] = [];
    const assignments: any[] = [];
    for (const item of ast.assignments) {
      if (!item) continue;
      // Some generated parsers may represent top-level indicator/strategy
      // declarations as Calls (callee === 'indicator' or 'strategy').
      // Treat those as indicators (string lines) to match the hand-parser
      // which stored them as raw lines.
      if (item.type === 'Indicator') {
        indicators.push(item.raw || item.text || item);
        continue;
      }
  if (item.type === 'Call' && item.callee === 'indicator') {
        // Reconstruct a simple source-like representation for the indicator call.
        function argToText(a: any): string {
          if (a == null) return '';
          if (Array.isArray(a)) return a.map(argToText).join(', ');
          if (typeof a === 'number') return String(a);
          if (typeof a === 'string') return a;
          // handle named arg shapes
          if (a.name && (a.value !== undefined)) return `${a.name}=${argToText(a.value)}`;
          if (a.named && a.name && a.value) return `${a.name}=${argToText(a.value)}`;
          if (a.type === 'Number') return String(a.value);
          if (a.type === 'String') return JSON.stringify(a.value);
          if (a.type === 'Identifier') return a.name;
          if (a.type === 'Call') return `${a.callee}(${(a.args||[]).map(argToText).join(', ')})`;
          if (a.type === 'Index') return `${argToText(a.target)}[${argToText(a.index)}]`;
          return String(a);
        }
        const text = `${item.callee}(${(item.args||[]).map(argToText).join(', ')})`;
        indicators.push(text);
        continue;
      }
      if (item.type === 'Assignment') {
        const id = item.id || item.name;
        assignments.push({ id, expr: adaptExpr(item.expr || item.value) });
        continue;
      }
      if (item.type === 'Call') {
        // represent bare calls as assignments with id '_call'
        assignments.push({ id: '_call', expr: adaptExpr(item) });
        continue;
      }
    }
    return { indicators, assignments };
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
  if (e.type === 'Call') {
    const outArgs: any[] = [];
    for (const a of (e.args || [])) {
      if (a && a.named) {
        // match hand-parser's naive shape: push the name as Identifier then the value
        outArgs.push({ type: 'Identifier', name: a.name });
        outArgs.push(adaptExpr(a.value));
      } else {
        outArgs.push(adaptExpr(a));
      }
    }
    return { type: 'Call', callee: e.callee || e.name, args: outArgs };
  }
  if (e.type === 'Array') return { type: 'Array', items: (e.items||[]).map(adaptExpr) };
  if (e.type === 'Index') return { type: 'Index', target: adaptExpr(e.target || e.base || e.object), index: adaptExpr(e.index) };
  return e;
}

export default adaptGeneratedProgram;
