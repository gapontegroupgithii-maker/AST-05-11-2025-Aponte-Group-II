# Deploy to Vercel (recommended)

Si quieres desplegar el proyecto en Vercel (rápido y gratuito para prototipos), sigue estos pasos.

1. Crea una cuenta en https://vercel.com/ (si no la tienes).
2. Conecta tu cuenta de GitHub a Vercel (Settings → Git Integrations).
3. En Vercel: "New Project" → Import from Git → selecciona `gapontegroupgithii-maker/AST-04-11-2025`.
4. Ajustes de build (para Vite/React):
   - Framework: Other (o Vite si detecta automaticamente)
   - Build Command: npm run build
   - Output Directory: dist
5. Configura Variables de Entorno (Environment Variables) desde el panel del proyecto en Vercel.
6. Despliega y verifica la URL de preview.
7. Para dominio propio: Domain → Add Domain → sigue instrucciones de DNS.

Archivo opcional `vercel.json` (ejemplo ya incluido en repo):

```json
{
  "builds": [{ "src": "package.json", "use": "@vercel/static-build", "config": { "distDir": "dist" } }],
  "routes": [{ "src": "/(.*)", "dest": "/index.html" }]
}
```

Si quieres que lo haga por ti, invítame a tu proyecto en Vercel y yo completaré los pasos de configuración.
