# Guía rápida para el usuario (sin conocimientos de programación)

Esta guía te dice exactamente qué hacer en cada paso para revisar y fusionar el PR — copia y pega donde necesites.

1) Verificar SSH (opcional, solo si usas Git+SSH)

  - Abrir PowerShell y ejecutar:

```powershell
ssh -T git@github.com
```

  - Si ves: "Hi <user>! You've successfully authenticated..." tu SSH está lista.

2) Abrir el Pull Request

  - URL del PR: https://github.com/gapontegroupgithii-maker/AST-04-11-2025/pull/new/main-local-copy
  - Pegas el título y la descripción desde `docs/pr_template.md` (ya generada).

3) Revisar la integración automática (CI)

  - En la página del PR ve a la pestaña "Checks".
  - Espera a que termine la ejecución.
  - Descarga los artifacts si el job los sube: `parser-diff.json` y `parser-diff-report.md`.

4) ¿Qué revisar en `parser-diff-report.md`?

  - Busca errores o mensajes en la sección "Hand AST" y "Generated AST".
  - Si las diferencias son estructurales y esperadas, marcar el PR como aprobado.
  - Si ves errores de parse (mensajes de `error`), no apruebes hasta que se resuelvan.

5) Aprobar y fusionar

  - Si todo está OK, presiona "Approve" y luego "Merge".
  - Recomendación: usar "Squash and merge" para mantener el historial limpio (opcional).

6) Si necesitas ayuda o algo falla

  - Copia el enlace del PR y pégalo en el chat con el texto: "Revisar CI" y yo (Copilot) revisaré artefactos y propondré correcciones.

7) Empujar cambios desde tu equipo (si te piden corrección)

  - Si necesitas empujar cambios pero no quieres configurar SSH, usa HTTPS+PAT (ver `scripts/push_https_example.ps1`).
