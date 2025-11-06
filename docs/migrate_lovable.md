# Migración / transferencia desde lovable.dev

Si tu proyecto está actualmente vinculado a `lovable.dev`, aquí tienes las opciones y los pasos para recuperar control total del despliegue.

Opción A — Transferir propiedad en lovable.dev (si tienes acceso admin)

1. Inicia sesión en la cuenta que actualmente administra el proyecto en lovable.dev.
2. Abre el proyecto y ve a Settings → Members / Ownership (o similar).
3. Añade tu cuenta (o la cuenta que deseas) como Owner y confírmalo.
4. Elimina usuarios o integraciones antiguas que no quieres que mantengan acceso.
5. Verifica que los webhooks/build hooks y variables de entorno estén configuradas para la cuenta que ahora controla el proyecto.

Si no tienes credenciales admin, contacta con el soporte de lovable.dev solicitando la transferencia. Prepara:

- Identificador del proyecto (URL o ID)
- Prueba de identidad / emails asociados

Opción B — Re-deploy en tu cuenta de hosting (recomendado)

1. Escoge un hosting moderno: Vercel, Netlify o GitHub Pages (para SPAs). Vercel es recomendado para apps React/Vite.
2. Conecta tu repo GitHub (ya pushé el código a `main-local-copy` en el repo destino). En Vercel: "Import Project" → GitHub → selecciona el repo.
3. Configura variables de entorno necesarias (API keys, secrets) en la interfaz del host.
4. Ejecuta un deploy y valida la app en el dominio de staging.
5. Si usas un dominio propio, actualiza DNS (A/CNAME) apuntando al host y verifica HTTPS.
6. Cuando estés satisfecho, puedes desactivar el proyecto en lovable.dev o eliminar la integración allí.

Notas sobre seguridad:
- No compartas tokens ni contraseñas en texto plano. Usa el UI del host para configurar secrets.
- Si quieres, puedo preparar los archivos `vercel.json` o `netlify.toml` para facilitar el deploy.

Si quieres que yo haga la migración por ti:
- Invítame temporalmente con un PAT (o invítame como colaborador en tu hosting), o
- Sigue las instrucciones y pásame el resultado del deploy (URL) y yo verificaré y ajustaré configuraciones.
