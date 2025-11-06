# Transpiler (Pine -> Star)

El transpiler presente en `src/lib/star-transpiler.ts` realiza una transformación ligera:

- Analiza el código Pine usando el parser (hand parser).
- Normaliza llamadas a la forma `star.*` mediante `transformProgram`.
- `transpilePineToStar(source)` devuelve una representación textual "Star" mínima.
- `transpileToJsModule(source)` devuelve un IIFE que al recibir el runtime ejecuta el AST transformado.

Limitaciones:
- MVP: no genera código JavaScript optimizado ni gestiona todos los edge-cases de Pine.
- Recomendación: usar `transpileToJsModule` para pruebas E2E porque incrusta el AST transformado.

Próximos pasos:
- mejorar compatibilidad con named args complejos y literales anidados.
