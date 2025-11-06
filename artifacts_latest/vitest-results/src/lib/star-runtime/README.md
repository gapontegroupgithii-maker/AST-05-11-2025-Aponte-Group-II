# Star Runtime (Phase3 scaffold)

Este directorio contiene un runtime mínimo para ejecutar ASTs generados por el parser "Star" (un gemelo de Pine Script v5).

Archivos principales:
- `index.ts` — evaluador simple que soporta nodos: Number, String, Identifier, Binary, Unary, Call, Array, Index.
- `runner.ts` — runner que parsea un script con el parser manual (`src/lib/star-parser/index.ts`) y evalúa asignaciones, registrando llamadas a `plot` y `indicators`.

Builtins incluidos (stubs):
- `math.avg`, `color.rgb`, `input.int`, `plot` (registra en `env.plots`), y un objeto `ta` con funciones `sma`, `rsi`, `highest`, `lowest` simples.
- `strategy` objeto mínimo con `commission` placeholder.

Uso rápido (desde el código):

import runner from './runner';
const res = runner.runScript(sourceCode);
console.log(res.plots, res.env);

Propósito: servir de andamiaje para Phase3 — ejecutar scripts parseados, validar transformaciones y escribir tests end-to-end. No está pensado para uso en producción; las funciones `ta.*` y `plot` son placeholders.
