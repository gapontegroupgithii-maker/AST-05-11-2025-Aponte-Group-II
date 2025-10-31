# create_backup.ps1
# Uso: Ejecutar en PowerShell desde la raíz del proyecto.
# Crea una rama git local de backup, intenta commitear, y genera un ZIP en backups/ con timestamp.

param(
    [string]$Exclude = "node_modules,.git,dist,build,*.zip",
    [switch]$Push
)

$ts = Get-Date -Format "yyyy-MM-dd_HHmmss"
$branch = "starscript/backup-$ts"
Write-Host "[backup] timestamp: $ts"
Write-Host "[backup] creando branch: $branch"

# Crear rama git, sin forzar push remoto
try {
    git rev-parse --is-inside-work-tree > $null 2>&1
} catch {
    Write-Error "No parece ser un repositorio git. Inicializa git o clona este repo antes de usar este script."
    exit 1
}

# Crear branch
& git checkout -b $branch

# Intentar commitear cambios (si existen)
& git add -A
$commitResult = & git commit -m "Backup created by Copilot on $ts" 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[backup] No se creó commit (no hay cambios o commit falló). Output:"
    Write-Host $commitResult
} else {
    Write-Host "[backup] Commit creado en branch $branch"
}

# Generar ZIP de la carpeta (excluyendo patrones simples)
$backupDir = Join-Path -Path "$(Get-Location)" -ChildPath "backups"
if (-not (Test-Path $backupDir)) { New-Item -Path $backupDir -ItemType Directory | Out-Null }
$zipPath = Join-Path $backupDir "backup-$ts.zip"

Write-Host "[backup] generando ZIP en: $zipPath"

# Construir lista de archivos a incluir (excluir .git y node_modules y backups zips)
# Usamos Get-ChildItem y filtrado
$excludePatterns = $Exclude -split ","
$all = Get-ChildItem -Path . -Recurse -Force | Where-Object {
    $full = $_.FullName
    foreach ($pat in $excludePatterns) {
        if ($pat -eq '') { continue }
        if ($full -like "*\$pat*" -or $full -like "*$pat") { return $false }
    }
    return $true
}

# Exportar a un folder temporal y comprimir (evita problemas con archivos abiertos)
$tempDir = Join-Path $env:TEMP "astro_backup_$ts"
if (Test-Path $tempDir) { Remove-Item -Recurse -Force $tempDir }
New-Item -ItemType Directory -Path $tempDir | Out-Null

foreach ($item in $all) {
    $rel = Resolve-Path $item.FullName -Relative
    $dest = Join-Path $tempDir $rel
    $destDir = Split-Path $dest -Parent
    if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
    if ($item.PSIsContainer) { continue }
    Copy-Item -Path $item.FullName -Destination $dest -Force
}

Compress-Archive -Path (Join-Path $tempDir '*') -DestinationPath $zipPath -Force

# Limpiar temporal
Remove-Item -Recurse -Force $tempDir

Write-Host "[backup] ZIP creado: $zipPath"

if ($Push) {
    Write-Host "[backup] Push solicitado: intentando push de branch $branch a origin (requiere credenciales configuradas)."
    & git push -u origin $branch
}

Write-Host "[backup] Hecho. Si quieres subir la copia a GitHub privado, ejecuta este script con -Push (y asegúrate de tener tus credenciales)."