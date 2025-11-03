// Minimal PEG grammar to support a subset of constructs used by tests.
// This is intentionally small; extend as Phase2 progresses.

Start
  = Program

Program
  = _ items:(LineOrBlank _)* {
      const extracted = items.map(i => i[0]).filter(x => x && x.type === 'Assignment');
      return { type: 'Program', assignments: extracted };
    }

LineOrBlank
  = Line / BlankLine

Line
  = Assignment / Call / Indicator

BlankLine
  = _ '\n'

Indicator
  = 'indicator' _ '(' _ str:StringLiteral _ ')' { return { type: 'Indicator', raw: text() } }

Assignment
  = id:Identifier _ '=' _ rhs:Expression _ { return { type: 'Assignment', id, expr: rhs } }

Expression
  = Call
  / Array
  / Index
  / StringLiteral
  / Number
  / Identifier

Call
  = callee:IdentifierOrPath _ '(' _ args:ArgumentList? _ ')' {
    return { type: 'Call', callee, args: args || [] };
  }

ArgumentList
  = first:Expression rest:(_ ',' _ Expression)* {
    return [first].concat(rest.map(r=>r[3]));
  }

Array
  = '[' _ elems:ArgumentList? _ ']' { return { type: 'Array', items: elems || [] } }

Index
  = id:Identifier _ '[' _ idx:Number _ ']' { return { type: 'Index', target: { type: 'Identifier', name: id }, index: { type: 'Number', value: Number(idx) } } }

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

Char
  = '\\' c:. { return c === 'n' ? '\n' : c === 't' ? '\t' : c; }
  / !'"' . { return text(); }

_ "whitespace"
  = [ \t\n\r]*
