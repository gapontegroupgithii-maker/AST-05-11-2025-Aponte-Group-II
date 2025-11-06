# Next steps and Phase plan (short)

Esta página resume las próximas acciones y la fase del proyecto que voy a atacar ahora.

Resumen rápido
- Estado actual: Phases de parser/runtime/transpiler (Phase0..4) implementadas y testadas localmente. Repositorio parcial subido al remoto nuevo en ramas no destructivas.
- Próxima fase priorizada: CI/CD (Phase6) — hacer que el pipeline haga validaciones adicionales (lint, tsc, parser-diff, subir artifacts) y preparar jobs auxiliares para releases.
- Objetivo inmediato: implementar `Phase6.1` (parser-diff & artifacts) y mejorar los jobs para que provean artefactos útiles para revisión.

Phase6.1 — parser-diff & artifacts (next)
- Por qué: detectar cambios no intencionales en la gramática y en la salida del parser (hand vs generated) y facilitar revisión cuando alguien sube cambios.
- Qué haré ahora:
  1. Añadiré un script `scripts/generate-parser-diff.js` que: genera el parser (si hace falta), ejecuta ambos parsers (hand vs generated) en un set de fixtures, y escribe `parser-diff.json` con diferencias.
  2. Modificaré `.github/workflows/ci.yml` (si hace falta) para ejecutar el script y subir `parser-diff.json` como artifact.
  3. Añadiré instrucciones en `docs/` con cómo interpretar `parser-diff.json`.
- Acceptance: CI carga `parser-diff.json` y el job puede fallar si hay diferencias que no son esperadas.

Follow-ups y tareas posteriores
- Phase6.2: preparar job de release (artifacts + changelog). 
- Phase7: mejorar docs y ejemplos ejecutables en `examples/`.
- Phase8: packaging y publicación (opcional): preparar `package.json` y workflow de release.

Comandos y cómo yo seguiré
- Ejecutaré ahora la creación del script `scripts/generate-parser-diff.js` (local) y te mostraré el contenido.
- Luego podrás ejecutar localmente para ver el diff:

```powershell
node ./scripts/generate-parser-diff.js
```

Preguntas rápidas
- ¿Quieres que el parser-diff haga `throw` y falle CI cuando haya cualquier diferencia, o prefieres que genere el artifact y el equipo revise manualmente? (elige: `fail-on-diff` o `artifact-only`) 

Si me das luz verde (y si quieres `fail-on-diff` o `artifact-only`), procedo a crear el script y el ajuste en CI.