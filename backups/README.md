Backups automáticos

Política de backups generados por los scripts del proyecto.

- Este directorio contiene archivos ZIP con snapshots del repo en el momento de backup.
- Nombre de archivo: backup-YYYY-MM-DD_HHMMSS.zip
- Para crear un backup localmente ejecuta: `powershell.exe -ExecutionPolicy Bypass -File .\\scripts\\create_backup.ps1`
- Para crear el branch git asociado y (opcionalmente) hacer push, ejecuta el script con `-Push` (necesita credenciales de git configuradas en tu máquina).

Notas de seguridad:
- No subir claves ni secretos dentro de los backups.
- Las copias en este folder están en tu disco — si quieres subir a GitHub se requiere push y permisos.
