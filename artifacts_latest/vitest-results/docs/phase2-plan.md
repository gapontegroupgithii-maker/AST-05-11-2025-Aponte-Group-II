# Phase 2 Plan — Parser & AST

Objetivo: completar un parser confiable y un pipeline AST que permita transformar Pine-like scripts a `star.` namespace y preparar generación opcional de parser con Peggy en CI.

Recomendación principal:
- Mantener la implementación hand-written como referencia rápida y para debug.
- Proveer una gramática `grammar.pegjs` y un job opcional de CI que genere `src/lib/star-parser/parser.cjs` con `npx peggy`. El job debe ser informativo (no bloquear rama principal) hasta que la compatibilidad esté verificada.

Work items:
- Especificar AST shape (Program, Assignment, Call, Identifier, Number, String, Array, Index, Binary).
- Completar transformer Pine→Star (mapeos: plot, ta.*, request.*, input).
- Añadir tests de compatibilidad generada vs hand (se salta si no existe parser.cjs).
- Añadir script `npm run build:parser` y un workflow `.github/workflows/parser-gen.yml` que tenga un job opcional `generate-parser` y un job `test` que dependa opcionalmente de la salida.

Riesgos y mitigaciones:
- ESM/CJS mismatch: generar `.cjs` y en tests usar `createRequire` para cargarlo.
- Diferencias AST: proveer tests que comparen AST normalizados y un adaptador de compatibilidad si es necesario.

Entregables:
- `src/lib/star-parser/grammar.pegjs` (gramática iterativa)
- `package.json` scripts: `build:parser`
- `tests/parser/generated-compat.test.ts`
- `.github/workflows/parser-gen.yml`
