// Minimal PEG grammar to support a subset of constructs used by tests.
// This is intentionally small; extend as Phase2 progresses.

Start
  = Program

Program
  = _ items:(LineOrBlank _)* {
      const extracted = items.map(i => i[0]).filter(x => x && (x.type === 'Assignment' || x.type === 'Call' || x.type === 'Indicator'));
      return { type: 'Program', assignments: extracted };
    }

LineOrBlank
  = Line / BlankLine / CommentLine / CommentBlock

Line
  = Assignment / Postfix / Indicator

BlankLine
  = _ '\n'

CommentLine
  = '//' (!'\n' .)* '\n'

CommentBlock
  = '/*' (!'*/' .)* '*/'

Indicator
  = 'indicator' _ '(' _ str:StringLiteral _ ')' { return { type: 'Indicator', raw: text() } }

Assignment
  = id:Identifier _ '=' _ rhs:Expression _ { return { type: 'Assignment', id: (id && id.name) ? id.name : id, expr: rhs } }

// Expression with operator precedence
Expression
  = AddSub

AddSub
  = left:MulDiv rest:(_ ('+' / '-') _ MulDiv)* {
    return rest.reduce((acc, r) => ({ type: 'Binary', op: r[1], left: acc, right: r[3] }), left);
  }

MulDiv
  = left:Pow rest:(_ ('*' / '/') _ Pow)* {
    return rest.reduce((acc, r) => ({ type: 'Binary', op: r[1], left: acc, right: r[3] }), left);
  }

Pow
  = left:Unary rest:(_ '^' _ Pow)? {
    if (rest && rest.length) return { type: 'Binary', op: '^', left, right: rest[0][3] };
    return left;
  }

Unary
  = op:('-' / '+') _ expr:Unary { return { type: 'Unary', op, expr }; }
  / Postfix

// Postfix handles chained calls and indexing (e.g., ta.hma(close,12)[2])
Postfix
  = head:(IdentifierOrPath / Identifier / StringLiteral / Number / Array / '(' _ Expression _ ')') tail:(_ (IndexSuffix / CallSuffix))* {
    let node = head;
    for (const [, part] of tail) {
      if (part && part.type === 'Index') {
        node = { type: 'Index', target: (typeof node === 'string' ? { type: 'Identifier', name: node } : node), index: part.index };
      } else if (part && part.type === 'Call') {
        // If node is a bare string (IdentifierOrPath), use it as callee name
        const calleeName = (typeof node === 'string') ? node : (node && node.name) || (node && node.callee) || node;
        node = { type: 'Call', callee: calleeName, args: part.args };
      }
    }
    return node;
  }

IndexSuffix
  = '[' _ idx:Expression _ ']' { return { type: 'Index', index: idx }; }

CallSuffix
  = '(' _ args:ArgumentList? _ ')' { return { type: 'Call', args: args || [] }; }

ArgumentList
  = first:Argument rest:(_ ',' _ Argument)* {
    return [first].concat(rest.map(r=>r[3]));
  }

Argument
  = NamedArg / Expression

NamedArg
  = id:Identifier _ '=' _ expr:Expression { return { named: true, name: id.name, value: expr }; }

Array
  = '[' _ elems:ArgumentList? _ ']' { return { type: 'Array', items: elems || [] } }

// Index handled by Postfix/IndexSuffix; keep legacy Index for compatibility if used elsewhere
Index
  = id:Identifier _ '[' _ idx:Number _ ']' { return { type: 'Index', target: { type: 'Identifier', name: id.name }, index: idx } }

IdentifierOrPath
  = i:Identifier rest:('.' Identifier)* { 
    const parts = [i.name];
    for (const [, r] of rest) parts.push(r.name);
    return parts.join('.');
  }

Identifier
  = $([a-zA-Z_][a-zA-Z0-9_]*) { return { type: 'Identifier', name: text() }; }

Number
  = $([0-9]+ ('.' [0-9]+)?) { return { type: 'Number', value: parseFloat(text()) }; }

StringLiteral
  = '"' chars:Char* '"' { return { type: 'String', value: chars.join('') } }
  / '\'' chars:SqChar* '\'' { return { type: 'String', value: chars.join('') } }

Char
  = '\\' c:. { return c === 'n' ? '\n' : c === 't' ? '\t' : c; }
  / !'"' . { return text(); }

SqChar
  = '\\' c:. { return c === 'n' ? '\n' : c === 't' ? '\t' : c; }
  / !"'" . { return text(); }

_ "whitespace"
  = [ \t\n\r]*
