@echo off
REM Script para ejecutar notificaciones automáticas de entregables
REM Este script debe ejecutarse desde el directorio raíz del proyecto

REM Configurar variables
set PROJECT_DIR=C:\Users\josti\Desktop\GestionColaborativa
set LOG_DIR=%PROJECT_DIR%\logs
set LOG_FILE=%LOG_DIR%\notifications-%date:~-4,4%%date:~-10,2%%date:~-7,2%.log

REM Crear directorio de logs si no existe
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

REM Cambiar al directorio del proyecto
cd /d "%PROJECT_DIR%"

REM Escribir inicio en log
echo [%date% %time%] ==================== INICIO NOTIFICACIONES ==================== >> "%LOG_FILE%"
echo [%date% %time%] Iniciando verificación de notificaciones de entregables... >> "%LOG_FILE%"

REM Ejecutar el script de notificaciones y capturar salida
node src/scripts/deliverable-notifications.js >> "%LOG_FILE%" 2>&1

REM Verificar resultado
if %errorlevel% equ 0 (
    echo [%date% %time%] Notificaciones procesadas exitosamente >> "%LOG_FILE%"
    echo [%date% %time%] SUCCESS: Notificaciones procesadas exitosamente
) else (
    echo [%date% %time%] ERROR: Error al procesar notificaciones - Código: %errorlevel% >> "%LOG_FILE%"
    echo [%date% %time%] ERROR: Error al procesar notificaciones - Código: %errorlevel%
)

echo [%date% %time%] ==================== FIN NOTIFICACIONES ==================== >> "%LOG_FILE%"
echo. >> "%LOG_FILE%"