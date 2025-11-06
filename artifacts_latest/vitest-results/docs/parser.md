# Parser notes

This project contains two parser implementations for Star Script:

- `src/lib/star-parser/index.ts` — a hand-written parser used as the canonical reference in tests.
- `src/lib/star-parser/grammar.pegjs` — a Peggy grammar that can be used to generate `parser.cjs`.

To regenerate the parser locally (the repo includes a `build:parser` npm script):

```powershell
npm run build:parser
```

This will create/update `src/lib/star-parser/parser.cjs` from the `grammar.pegjs` file.

CI: `.github/workflows/parser-gen.yml` will optionally regenerate the parser on pushes/PRs and run tests.
