<#
push_to_new_repo.ps1
Script para subir este repositorio a un nuevo repositorio remoto (por ejemplo, en otra cuenta GitHub).

Modos:
  - mirror: copia todas las ramas y etiquetas (preserva historial). Hace push como espejo (force).
  - simple: sube solo la rama 'main' (útil si quieres un repo "nuevo" sin historia compartida).

Uso (PowerShell, desde la raíz del repo):
  # modo mirror (preserva todo):
  .\scripts\push_to_new_repo.ps1 -RemoteUrl "https://github.com/NEWOWNER/NEWREPO.git" -Mode mirror

  # modo simple (solo main):
  .\scripts\push_to_new_repo.ps1 -RemoteUrl "https://github.com/NEWOWNER/NEWREPO.git" -Mode simple

Nota de seguridad: necesitarás permisos para push al remoto. Usa HTTPS con PAT en el formato https://<PAT>@github.com/OWNER/REPO.git (temporal) o autentica con `gh auth login` en la cuenta destino antes de ejecutar.

#>

param(
    [Parameter(Mandatory=$true)]
    [string]$RemoteUrl,

    [ValidateSet('mirror','simple')]
    [string]$Mode = 'simple'
)

function Abort($msg) {
    Write-Error $msg
    exit 1
}

if (-not (Test-Path .git)) { Abort "Ejecuta este script desde la raíz del repositorio (donde está .git)." }

Write-Host "Remote destino: $RemoteUrl"
Write-Host "Modo: $Mode"

if ($Mode -eq 'mirror') {
    Write-Host "Creando mirror (se force-pusheará TODO: ramas y tags)."
    # Crear un clone --mirror temporal
    $tmp = Join-Path $env:TEMP ([guid]::NewGuid().ToString())
    git clone --mirror . $tmp || Abort "Fallo al clonar espejo."
    Push-Location $tmp
    Write-Host "Pushing mirror to $RemoteUrl ..."
    git remote set-url origin $RemoteUrl
    git push --mirror || Abort "Fallo al hacer git push --mirror. Revisa permisos."
    Pop-Location
    Remove-Item -Recurse -Force $tmp
    Write-Host "Mirror push completado."
} else {
    Write-Host "Modo simple: subiré la rama 'main' y tags básicos si existen."
    # Verificar main existe
    git rev-parse --verify main 2>$null
    if ($LASTEXITCODE -ne 0) { Write-Host "No existe la rama 'main' local; usar la rama actual."; $branch = (git rev-parse --abbrev-ref HEAD).Trim() } else { $branch = 'main' }

    # Añadir remoto temporal llamado new-origin
    git remote remove new-origin 2>$null
    git remote add new-origin $RemoteUrl || Abort "No pude añadir remote $RemoteUrl"

    Write-Host "Pusheando rama $branch a new-origin/$branch ..."
    git push new-origin $branch --force || Abort "Fallo al push. Revisa permisos."

    # Opcional: push tags
    $tags = git tag
    if ($tags) {
        Write-Host "Pushing tags..."
        git push new-origin --tags || Write-Host "Advertencia: fallo al pushear tags (no crítico)."
    }

    Write-Host "El repo mínimo fue subido a $RemoteUrl en la rama $branch."
}

Write-Host "Acción completada. Comprueba el repo destino en GitHub o usa 'gh repo view' desde la cuenta destino."
