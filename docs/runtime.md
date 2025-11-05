# Runtime (star-runtime)

El runtime mínimo está en `src/lib/star-runtime/runner.ts` y `src/lib/star-runtime/index.ts`.

Características:
- Series sintéticas (`close`, `high`, `low`) para pruebas.
- Builtins: `math.avg`, `color.rgb`, `input.int`, `plot` (registra plots), `ta.sma`, `ta.rsi`, `ta.highest`, `ta.lowest`.
- `request.security` devuelve series determinísticas por símbolo/timeframe.
- `strategy` stub con `order`, `entry`, `exit`, tracking de `trades`, `orders`, `position` y cálculo de `pnl()` (realized + unrealized).

Extensiones recomendadas:
- Simular liquidez y slippage más realista.
- Añadir ejecución en sandbox (WebWorker) para entornos de producción.
