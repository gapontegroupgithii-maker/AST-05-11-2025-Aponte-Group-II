# Pull Request Template

TÍTULO: Migración / Integración desde rama `main-local-copy` → `main`

Descripción:

Este PR integra los cambios desarrollados localmente en la rama `main` del proyecto AST.

- Contiene: parser, runtime, transpiler, tests, CI updates y scripts de soporte.
- Objetivo: consolidar el historial y continuar el flujo de CI/CD bajo el repo destino.

Checklist (por favor marcar antes de merge):

- [ ] He revisado los artefactos de CI (vitest results) en la sección "Checks" del PR.
- [ ] He descargado y revisado `parser-diff.json` y `parser-diff-report.md` (Artifacts) para confirmar que los cambios al parser son intencionales o están normalizados.
- [ ] No hay errores de lint ni de typecheck (o se han documentado y aceptado).
- [ ] Si hubo diferencias en `parser-diff`, se aceptaron explícitamente o se aplicaron correcciones a la rama `main-local-copy`.
- [ ] Revisión por al menos 1 revisor (automático por CODEOWNERS si aplica).

Notas técnicas (para revisores):

- CI ejecuta: lint -> tsc -> build parser (si existe grammar) -> tests -> parser-diff (fail-on-diff).
- Herramientas de soporte en repo:
  - `scripts/generate-parser-diff.cjs` — genera `parser-diff.json` y falla si hay cambios semánticos.
  - `scripts/generate-parser-report.cjs` — genera `parser-diff-report.md` legible.

Instrucciones rápidas para el revisor:

1. Abrir la pestaña Checks y esperar a que CI termine.
2. En Artifacts (o en job output) descargar `parser-diff.json` y `parser-diff-report.md`.
3. Revisar diferencias, si todo está OK marcar el PR aprobado.
