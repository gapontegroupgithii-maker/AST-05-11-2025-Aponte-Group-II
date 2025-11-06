# AST — Uso básico

Este repositorio contiene la implementación de Star Script (compatible con Pine v5 a nivel de pruebas) y un runtime mínimo usado para ejecutar scripts de ejemplo.

Cómo ejecutar ejemplos localmente

1. Instala dependencias:

```powershell
npm ci
```

2. Ejecuta la suite de tests (Vitest):

```powershell
npm run test
```

3. Ejecuta un script con el runner desde Node.js:

```ts
import runner from './src/lib/star-runtime/runner';
const res = runner.runScript(`indicator("t")\n a = sma(close, 14)\n plot(a)\n`);
console.log(res.plots);
```

CLI: transpilar desde archivos Pine a Star (texto):

```powershell
npm run transpile -- --in examples/example.pine --out-star out.star
```

Para generar un módulo ejecutable:

```powershell
npm run transpile -- --in examples/example.pine --out-module out.js
```
