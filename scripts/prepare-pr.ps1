<#
prepare-pr.ps1
Script para: 1) traer ramas, 2) mergear origin/main en main-local-copy (crea ancestro común), 3) push --force de main-local-copy, 4) crear PR con gh (si está instalado) usando docs/pr_template.md
Uso: desde la raíz del repo:
    powershell -ExecutionPolicy Bypass -File .\scripts\prepare-pr.ps1
#>

# Helper: Ejecuta comando git y devuelve el código de salida y salida estandar
function Exec-Git {
    param([string]$args)
    $output = git $args 2>&1
    $code = $LASTEXITCODE
    return @{ ExitCode = $code; Output = $output }
}

# Check git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "git no está instalado o no está en PATH. Instala git y vuelve a ejecutar."
    exit 2
}

# Check we are in repo root
if (-not (Test-Path .git)) {
    Write-Error "Este script debe ejecutarse desde la raíz del repositorio (contiene .git)."
    exit 2
}

Write-Host "Fetch desde origin..."
git fetch origin

# Ensure branch exists locally, create tracking if needed
$branch = 'main-local-copy'
Write-Host "Comprobando existencia de rama '$branch'..."
git show-ref --verify --quiet "refs/heads/$branch"
$exists = ($LASTEXITCODE -eq 0)
if (-not $exists) {
    Write-Host "Rama local '$branch' no existe. Intentando crear tracking desde origin/$branch o crear nueva rama..."
    $remoteInfo = git ls-remote --heads origin $branch 2>$null
    $remoteHas = -not [string]::IsNullOrEmpty($remoteInfo)
    if ($remoteHas) {
        git checkout -b $branch origin/$branch
    } else {
        git checkout -b $branch
    }
} else {
    git checkout $branch
    git pull --rebase origin $branch
}

# Merge origin/main (permitir historiales no relacionados)
Write-Host "Mergeando origin/main en $branch (se usará --allow-unrelated-histories para crear ancestro común si fuera necesario)..."
git merge origin/main --allow-unrelated-histories -m "Merge origin/main into $branch to create common ancestor for PR"
if ($LASTEXITCODE -ne 0) {
    # Check for conflicts
    $conflicts = git ls-files -u
    if ($conflicts) {
        Write-Host "Se detectaron conflictos al hacer merge. Debes resolverlos manualmente. Archivos en conflicto:" -ForegroundColor Yellow
        git ls-files -u | ForEach-Object { Write-Host $_ }
        Write-Host "Después de resolver: git add . ; git commit ; luego: git push origin $branch --force" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Error "El merge devolvió código de salida $LASTEXITCODE. Revisa la salida de git para más detalles."
        exit 1
    }
}

# Push --force con confirmación
Write-Host "Listo para hacer push --force de $branch a origin. Esto sobrescribirá la rama remota $branch."
$confirm = Read-Host "Confirmas push --force de $branch -> origin/$branch? (Y/N)"
if ($confirm -notin @('Y','y')) {
    Write-Host "Operación cancelada por el usuario. Ningún cambio fue enviado."
    exit 0
}

git push origin $branch --force
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push falló. Revisa permisos/remote y vuelve a intentarlo."
    exit 1
}

# Try to create PR with gh
if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "gh CLI detectado: creando PR usando docs/pr_template.md como cuerpo..."
    gh pr create --base main --head $branch --title "Migración / Integración desde rama $branch → main" --body-file "docs/pr_template.md"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PR creado correctamente con gh (deberías ver la página del PR abierta en el navegador)."
    } else {
        Write-Host "gh pr create falló (exit $LASTEXITCODE). Puedes crear el PR manualmente en GitHub o verificar gh auth status." -ForegroundColor Yellow
    }
} else {
    # Build compare URL
    $remoteUrl = git remote get-url origin
    $httpUrl = $remoteUrl -replace '^git@([^:]+):([^/]+)/(.+)\.git$','https://$1/$2/$3' -replace '\.git$',''
    if ($httpUrl -and $httpUrl -match 'https://') {
        $compareUrl = "$httpUrl/compare/main...$branch?expand=1"
        Write-Host "gh no está instalado. Abre el siguiente enlace para crear el PR en el navegador:" -ForegroundColor Green
        Write-Host $compareUrl
        Start-Process $compareUrl
    } else {
        Write-Host "No se pudo construir URL de comparación. Crea el PR manualmente en GitHub: base=main, compare=$branch" -ForegroundColor Yellow
    }
}

Write-Host "Hecho. Si el PR no aparece automáticamente, refresca la página de comparación en GitHub y deberías ver 'Create Pull Request'."
