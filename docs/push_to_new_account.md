# Subir este repo a una nueva cuenta privada (guía rápida)

Resumen: si quieres tener el mismo código en otra cuenta GitHub (repositorio privado), hay dos opciones principales:

- Mirror (preserva historial y todas las ramas/tags). Ideal si quieres una copia exacta.
- Simple (sube solo la rama `main` o la rama actual). Ideal si quieres un "nuevo" repo sin histórico compartido.

He añadido `scripts/push_to_new_repo.ps1` que automatiza ambos métodos. A continuación los pasos y cómo usarlo.

Pasos previos (en la nueva cuenta GitHub):

1. Crea la nueva cuenta GitHub (por ejemplo: `new.email@example.com`).
2. Inicia sesión con esa cuenta en la máquina donde ejecutarás el push o usa la GitHub CLI (`gh`) autenticada con esa cuenta.
   - Para autenticar `gh` con la nueva cuenta: `gh auth login` y sigue las instrucciones.
3. Crea un repositorio privado vacío en la nueva cuenta (opcional — el script puede push a la URL si existe):

   Con `gh` (autenticada en la nueva cuenta):

   gh repo create NEWOWNER/NEWREPO --private --confirm

   O crea el repo desde la web y copia la URL (ej. `https://github.com/NEWOWNER/NEWREPO.git`).

Usar el script (desde la raíz del proyecto, PowerShell):

- Modo simple (solo `main` o branch actual):

  .\scripts\push_to_new_repo.ps1 -RemoteUrl "https://github.com/NEWOWNER/NEWREPO.git" -Mode simple

- Modo mirror (preserva todo):

  .\scripts\push_to_new_repo.ps1 -RemoteUrl "https://github.com/NEWOWNER/NEWREPO.git" -Mode mirror

Notas importantes de autenticación:

- HTTPS + PAT: si usas la URL HTTPS para el RemoteUrl y no quieres re-autenticar gh, puedes usar temporalmente la URL con PAT:

  https://<PAT>@github.com/NEWOWNER/NEWREPO.git

  Donde `<PAT>` es un token con permiso `repo` y `workflow`. Evita dejar el PAT guardado en archivos; es mejor autenticar `gh`.

- SSH: si prefieres SSH, configura la clave SSH en la nueva cuenta y usa la URL `git@github.com:NEWOWNER/NEWREPO.git`.

Si quieres que el asistente prepare cambios menores (por ejemplo renombrar `package.json` o `name` del proyecto para la nueva cuenta), dime qué campos quieres cambiar y puedo aplicar los parches localmente ahora. Después puedes ejecutar el script para subir.

Si quieres que cuando crees la nueva cuenta me digas el email/owner, te daré un comando listo para ejecutar que creará el repo con `gh`, empujará el contenido y dejará todo en privado sin más pasos manuales.

Seguridad y privacidad

- Si tu repo es privado, mantén esa configuración en el repo nuevo y no compartas el PAT públicamente.
- Nunca ejecutes comandos que peguen tu PAT en texto visible si estás en un equipo público.

Siguiente paso que puedo hacer por ti ahora:

1. Modificar archivos locales antes de push (por ejemplo, actualizar `package.json`, README o remover datos sensibles). Dime qué quieres cambiar y lo edito.
2. Generar el comando completo para crear el repo en la nueva cuenta con `gh`, pushear el contenido y confirmar (lo pegas y ejecutas).

Ejemplo de comando único (cuando estés autenticado en la nueva cuenta con `gh`):

```powershell
# create repo (private) and push the current main branch as initial commit there
gh repo create NEWOWNER/NEWREPO --private --source=. --remote=new-origin --push
```

Eso crea el repo, añade remoto `new-origin` y hace push del contenido actual.

Si quieres que prepare todo para la nueva cuenta ahora (plantillas, nombres cambiados, etc.), dime el nombre del repo nuevo y si lo deseas con historial o sin historial. Yo aplicaré los cambios y te daré el comando final listo para ejecutar.

***
