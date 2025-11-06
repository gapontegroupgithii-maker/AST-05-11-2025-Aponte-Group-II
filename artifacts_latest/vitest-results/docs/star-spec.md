# Star Script specification (draft)

Namespace: `star.`

Objetivo: definir el subconjunto inicial de Pine Script v5 que Star Script soportará, y el mapeo entre Pine y Star para la fase inicial.

1. Alcance (baseline)
- Basado en Pine Script v5 subset: expresiones, llamadas a funciones, arrays/historical indexing, assignments, `plot`, `input.*`, `ta.*` (SMA, RSI, highest/lowest), `request.security` (stub), `strategy.*` (stubs).

2. Mapping inicial (reglas simples)
- Pine `plot(...)` -> `star.plot(...)`
- `ta.sma(src, len)` -> `star.ta.sma(src, len)` (o `ta.sma` mapeado a `star.ta.sma` por transpiler)
- `color.rgb(...)` -> `star.color.rgb(...)`
- `input.int(def, title)` -> `star.input.int(def, { title: '...' })` (support named args)
- `request.security(symbol, timeframe, expr)` -> `star.request.security(symbol, timeframe, expr)` (runtime provides stub)
- `strategy.entry(id, qty)` and `strategy.exit(id)` -> `star.strategy.entry(...)` / `star.strategy.exit(...)`

3. Builtins iniciales
- `star.plot`, `star.input.*`, `star.color.*`, `star.ta.*` (sma, rsi, highest, lowest), `star.request.security`, `star.strategy` (entry/exit), `math.*` helpers.

4. Criterios de aceptación
- Parser debe generar AST consistente para los ejemplos de prueba en `tests/star-examples/`.
- Transpiler heurístico (fase 1) debe convertir la mayoría de snippets simples, con tests que cubran `plot`, `ta.*`, `input.*`, `request.security` y `strategy.*`.

5. Scripts de prueba iniciales
- `tests/star-examples/ma_simple.pine`
- `tests/star-examples/rsi_example.pine`
- `tests/star-examples/Test_HL_strategy.pine`

6. Notas de ejecución
- El runtime actual ejecuta scripts evaluando AST con un env simulado. En fases posteriores el runtime será seguro (Web Worker o transpiler a JS con límites).

7. Futuras extensiones
- Soporte completo Pine v5, request.security con multi-timeframe, estrategia completa con órdenes simuladas y backtester.
# Star Script — Especificación inicial (Fase 0)

Última actualización: 2025-10-30

Propósito
-------
Star Script es un lenguaje gemelo / compatible con Pine Script v5 (TradingView) orientado a uso privado en esta aplicación. El objetivo de la Fase 0 es definir el contrato mínimo, el namespace `star.` y los mapeos iniciales que permitiremos en la MVP.

Alcance (baseline)
------------------
- Compatibilidad objetivo: Pine Script v5 (baseline), centrado en indicadores y estrategias que usan llamadas comunes (`indicator`, `strategy`, `ta.*`, `plot`, `plotshape`, `input.*`, `request.security*`, arrays, indexación histórica `[n]`, `var`, `switch`, expresiones). 
- No se garantiza compatibilidad 100% en Fase 1 (MVP heurístico). Fase 2 (parser+AST) abordará cobertura completa.

Reglas globales / Namespace
--------------------------
- Todos los símbolos API expuestos por el runtime se agrupan bajo `star.`. Ejemplos:
  - `indicator(...)` → `star.indicator(...)`
  - `strategy(...)` → `star.strategy(...)`
  - `ta.sma(x, n)` → `star.ta.sma(x, n)`
  - `plot(x)` → `star.plot(x)`
  - `plotshape(cond, ...)` → `star.plotshape(cond, ...)`
  - `color.rgb(r,g,b,a?)` → `star.color.rgb(r,g,b,a?)`
  - `input(title, defval)` → `star.input(...)`
  - `request.security_lower_tf(...)` → `star.request.security_lower_tf(...)`
  - `syminfo.tickerid` → `star.syminfo.tickerid`
  - `timeframe.isseconds` → `star.timeframe.isseconds`

Convenciones sintácticas (MVP)
-----------------------------
- Mantendremos la sintaxis general de Pine v5 en los scripts; el transpiler añadirá `star.` a llamadas conocidas y mapeará identificadores dot-separated (`ta.`, `strategy.`, `request.`) a `star.`.
- Indexado histórico (`close[1]`, `ta.hma(close, 12)[2]`) se preserva tal cual. El runtime debe interpretar las referencias históricas correctamente.

Mapeo rápido (ejemplos)
-----------------------
- Pine: `indicator("My", overlay=true)`
- Star: `star.indicator("My", overlay=true)`

- Pine: `plot(ta.sma(close, 14), color=color.red)`
- Star: `star.plot(star.ta.sma(star.close, 14), { color: star.color.rgb(255,0,0) })`

- Pine: `var float x = na` → Star: `var float x = na` (variables siguien siendo variables; llamadas API se prefijan)

Seguridad y restricciones (resumen)
----------------------------------
- El runtime ejecutará scripts en un entorno sandbox (Web Worker o sandbox JS) con límites: timeout por ejecución, límite de iteraciones/recursión y ninguna capacidad de IO/Network por defecto.
- Solo las APIs `star.*` están expuestas; las funciones internas de la app (window, fetch, fs) estarán inaccesibles.

Tests y ejemplos
----------------
En `tests/star-examples/` incluiremos ejemplos que servirán como suite inicial de validación (MA simple, RSI, y un script de strategy más grande provisto por el usuario).

Contrato de aceptación para Fase 0
--------------------------------
- `docs/star-spec.md` revisado y aprobado por el usuario.
- 3 scripts de ejemplo añadidos a `tests/star-examples/`.

Notas
-----
- Esta especificación es un primer borrador (Fase 0). Tras tu validación avanzaremos a la Fase 1 (MVP transpiler heurístico).
