# Phase 2 — Decision: hybrid parser strategy

After iterating on both a hand-written parser and a PEG grammar, we adopt a hybrid strategy:

- Development/faster iteration: keep the hand-written parser (`src/lib/star-parser/index.ts`) as a readable, debuggable reference.
- CI / Release: provide an optional generated parser from `grammar.pegjs` via `peggy` (artifact `parser.cjs`).
- Compatibility layer: tests compare normalized AST shapes between hand and generated parsers; if mismatch, CI flags differences and provides diff artifacts.

Rationale:
- Peggy provides longer-term maintainability for grammar changes and community tooling; hand-written parser is easier to debug and extend quickly.
- Hybrid approach prevents developer disruption while enabling automation and reproducibility.
