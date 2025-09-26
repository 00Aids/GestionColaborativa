@echo off
REM Script para configurar tarea programada de notificaciones (versión simple)
REM No requiere permisos de administrador

set TASK_NAME=GestionColaborativa-Notifications
set PROJECT_DIR=C:\Users\josti\Desktop\GestionColaborativa
set SCRIPT_PATH=%PROJECT_DIR%\scripts\run-notifications.bat

echo 🚀 Configurando tarea programada para notificaciones automáticas...
echo 📁 Proyecto: %PROJECT_DIR%
echo ⏰ Horario: Diario a las 09:00
echo.

REM Eliminar tarea existente si existe
echo 🗑️ Eliminando tarea existente (si existe)...
schtasks /delete /tn "%TASK_NAME%" /f >nul 2>&1

REM Crear nueva tarea programada
echo ➕ Creando nueva tarea programada...
schtasks /create /tn "%TASK_NAME%" /tr "\"%SCRIPT_PATH%\"" /sc daily /st 09:00 /f

if %errorlevel% equ 0 (
    echo ✅ Tarea programada '%TASK_NAME%' creada exitosamente
    echo.
    echo 📋 Detalles de la tarea:
    echo    - Nombre: %TASK_NAME%
    echo    - Script: %SCRIPT_PATH%
    echo    - Horario: Diario a las 09:00
    echo    - Usuario: %USERNAME%
    echo.
    
    REM Mostrar información de la tarea
    echo 📊 Información de la tarea:
    schtasks /query /tn "%TASK_NAME%" /fo list
    echo.
    
    REM Preguntar si ejecutar ahora
    set /p "RUN_NOW=Desea ejecutar la tarea ahora para probar? (s/n): "
    if /i "%RUN_NOW%"=="s" (
        echo 🏃 Ejecutando tarea...
        schtasks /run /tn "%TASK_NAME%"
        echo ✅ Tarea ejecutada. Revise los logs en: %PROJECT_DIR%\logs\
    )
    
    echo.
    echo 🎉 Configuración completada exitosamente!
    echo.
    echo 📝 Para gestionar la tarea:
    echo    - Ver tareas: schtasks /query /tn "%TASK_NAME%"
    echo    - Ejecutar manualmente: schtasks /run /tn "%TASK_NAME%"
    echo    - Eliminar tarea: schtasks /delete /tn "%TASK_NAME%" /f
    echo    - Ver logs: dir "%PROJECT_DIR%\logs\"
    
) else (
    echo ❌ Error creando la tarea programada
    echo 💡 Intente ejecutar como administrador o use el script PowerShell
)

echo.
pause