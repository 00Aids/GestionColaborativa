# Script para configurar tarea programada de notificaciones automáticas
# Ejecutar como administrador

param(
    [string]$TaskName = "GestionColaborativa-Notifications",
    [string]$ProjectPath = "C:\Users\josti\Desktop\GestionColaborativa",
    [string]$ScheduleTime = "09:00",  # Hora de ejecución diaria
    [switch]$Remove = $false
)

# Verificar si se ejecuta como administrador
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Error "Este script debe ejecutarse como administrador"
    exit 1
}

# Función para eliminar tarea existente
function Remove-ExistingTask {
    param($Name)
    
    try {
        $existingTask = Get-ScheduledTask -TaskName $Name -ErrorAction SilentlyContinue
        if ($existingTask) {
            Unregister-ScheduledTask -TaskName $Name -Confirm:$false
            Write-Host "✅ Tarea existente '$Name' eliminada" -ForegroundColor Green
        }
    } catch {
        Write-Host "ℹ️ No se encontró tarea existente '$Name'" -ForegroundColor Yellow
    }
}

# Si se solicita eliminar la tarea
if ($Remove) {
    Remove-ExistingTask -Name $TaskName
    Write-Host "🗑️ Tarea programada eliminada exitosamente" -ForegroundColor Green
    exit 0
}

Write-Host "🚀 Configurando tarea programada para notificaciones automáticas..." -ForegroundColor Cyan
Write-Host "📁 Proyecto: $ProjectPath" -ForegroundColor Gray
Write-Host "⏰ Horario: Diario a las $ScheduleTime" -ForegroundColor Gray

# Eliminar tarea existente si existe
Remove-ExistingTask -Name $TaskName

# Configurar la acción (script a ejecutar)
$scriptPath = Join-Path $ProjectPath "scripts\run-notifications.bat"
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$scriptPath`""

# Configurar el trigger (diario a las 9:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At $ScheduleTime

# Configurar las opciones de la tarea
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RunOnlyIfNetworkAvailable

# Configurar el principal (usuario que ejecuta la tarea)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

# Crear la tarea programada
try {
    Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "Ejecuta notificaciones automáticas para el sistema de Gestión Colaborativa"
    
    Write-Host "✅ Tarea programada '$TaskName' creada exitosamente" -ForegroundColor Green
    Write-Host "📋 Detalles de la tarea:" -ForegroundColor Cyan
    Write-Host "   - Nombre: $TaskName" -ForegroundColor Gray
    Write-Host "   - Script: $scriptPath" -ForegroundColor Gray
    Write-Host "   - Horario: Diario a las $ScheduleTime" -ForegroundColor Gray
    Write-Host "   - Usuario: SYSTEM" -ForegroundColor Gray
    
    # Mostrar información de la tarea creada
    $task = Get-ScheduledTask -TaskName $TaskName
    Write-Host "📊 Estado de la tarea: $($task.State)" -ForegroundColor Gray
    
    # Opción para ejecutar inmediatamente
    $runNow = Read-Host "¿Desea ejecutar la tarea ahora para probar? (s/n)"
    if ($runNow -eq "s" -or $runNow -eq "S") {
        Start-ScheduledTask -TaskName $TaskName
        Write-Host "🏃 Tarea ejecutada. Revise los logs en: $ProjectPath\logs\" -ForegroundColor Green
    }
    
} catch {
    Write-Error "❌ Error creando la tarea programada: $($_.Exception.Message)"
    exit 1
}

Write-Host "`n🎉 Configuración completada exitosamente!" -ForegroundColor Green
Write-Host "📝 Para gestionar la tarea:" -ForegroundColor Cyan
Write-Host "   - Ver tareas: Get-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "   - Ejecutar manualmente: Start-ScheduledTask -TaskName '$TaskName'" -ForegroundColor Gray
Write-Host "   - Eliminar tarea: .\setup-scheduled-task.ps1 -Remove" -ForegroundColor Gray
Write-Host "   - Ver logs: dir $ProjectPath\logs\" -ForegroundColor Gray