# Sistema de Notificaciones Automáticas para Entregables

## Descripción
Este sistema envía notificaciones automáticas para mantener a estudiantes y coordinadores informados sobre el estado de los entregables.

## Tipos de Notificaciones

### 1. Notificaciones en Tiempo Real
Se envían automáticamente cuando ocurren eventos en la aplicación:

- **Entregable Enviado**: Notifica al coordinador cuando un estudiante envía un entregable
- **Estado Actualizado**: Notifica al estudiante cuando se aprueba, rechaza o solicitan cambios
- **Comentario Agregado**: Notifica cuando se agrega un comentario a un entregable

### 2. Notificaciones Programadas
Se ejecutan mediante tareas programadas para verificar:

- **Próximos a Vencer**: Entregables que vencen en 3 días y 1 día
- **Vencidos**: Entregables que han pasado su fecha límite
- **Pendientes de Revisión**: Entregables entregados hace más de 2 días sin revisar

## Configuración de Tareas Programadas

### 🚀 Configuración Automática (Recomendado)

#### Opción 1: Script Batch Simple
```bash
# Ejecutar desde el directorio del proyecto
cd C:\Users\josti\Desktop\GestionColaborativa
scripts\setup-task-simple.bat
```

#### Opción 2: Script PowerShell (Como Administrador)
```powershell
# Ejecutar PowerShell como administrador
cd C:\Users\josti\Desktop\GestionColaborativa
.\scripts\setup-scheduled-task.ps1
```

**Características de la configuración automática:**
- ✅ Tarea programada diaria a las 09:00
- ✅ Logging automático en `logs/notifications-YYYYMMDD.log`
- ✅ Manejo de errores y reintentos
- ✅ Ejecución como servicio del sistema

### 📋 Configuración Manual (Windows)

Si prefieres configurar manualmente:

1. **Abrir el Programador de Tareas**
   - Presiona `Win + R`, escribe `taskschd.msc` y presiona Enter

2. **Crear Nueva Tarea**
   - Clic derecho en "Biblioteca del Programador de Tareas"
   - Seleccionar "Crear tarea..."

3. **Configuración General**
   - Nombre: `GestionColaborativa-Notifications`
   - Descripción: `Verificación automática de notificaciones para entregables`
   - Ejecutar con los privilegios más altos: ✓

4. **Configuración de Desencadenadores**
   - Nuevo desencadenador
   - Tipo: Diariamente
   - Hora: 09:00 AM

5. **Configuración de Acciones**
   - Nueva acción
   - Acción: Iniciar un programa
   - Programa: `C:\Users\josti\Desktop\GestionColaborativa\scripts\run-notifications.bat`
   - Iniciar en: `C:\Users\josti\Desktop\GestionColaborativa`

### Linux/macOS (Cron)

Agregar al crontab (`crontab -e`):

```bash
# Ejecutar cada 4 horas de 8 AM a 8 PM
0 8,12,16,20 * * * cd /ruta/al/proyecto && node src/scripts/deliverable-notifications.js >> logs/notifications.log 2>&1
```

## Ejecución Manual

Para ejecutar las notificaciones manualmente:

### Windows
```cmd
cd C:\Users\josti\Desktop\GestionColaborativa
scripts\run-notifications.bat
```

### Linux/macOS
```bash
cd /ruta/al/proyecto
node src/scripts/deliverable-notifications.js
```

## Logs y Monitoreo

El script genera logs en la consola con información sobre:
- Número de entregables procesados
- Notificaciones enviadas exitosamente
- Errores encontrados

### Ejemplo de salida:
```
🚀 Iniciando verificación de notificaciones de entregables...
📅 Fecha: 15/12/2024 08:00:00
🔍 Verificando entregables próximos a vencer...
✅ Procesados 3 entregables próximos a vencer
🔍 Verificando entregables vencidos...
✅ Procesados 1 entregables vencidos
🔍 Verificando entregables pendientes de revisión...
✅ Procesados 2 entregables pendientes de revisión
✅ Verificación de notificaciones completada
🎉 Script ejecutado exitosamente
```

## 🔧 Gestión de la Tarea Programada

### Comandos Útiles

#### Ver estado de la tarea:
```bash
schtasks /query /tn "GestionColaborativa-Notifications"
```

#### Ejecutar manualmente:
```bash
schtasks /run /tn "GestionColaborativa-Notifications"
```

#### Eliminar la tarea:
```bash
schtasks /delete /tn "GestionColaborativa-Notifications" /f
```

#### Ver logs:
```bash
dir C:\Users\josti\Desktop\GestionColaborativa\logs\
```

### 📊 Monitoreo y Logs

Los logs se guardan automáticamente en:
- **Ubicación**: `logs/notifications-YYYYMMDD.log`
- **Formato**: Fecha y hora con cada acción
- **Rotación**: Un archivo por día

#### Ejemplo de log:
```
[15/12/2024 09:00:01] ==================== INICIO NOTIFICACIONES ====================
[15/12/2024 09:00:01] Iniciando verificación de notificaciones de entregables...
[15/12/2024 09:00:02] 🔍 Verificando entregables próximos a vencer...
[15/12/2024 09:00:03] ✅ Procesados 3 entregables próximos a vencer
[15/12/2024 09:00:04] SUCCESS: Notificaciones procesadas exitosamente
[15/12/2024 09:00:04] ==================== FIN NOTIFICACIONES ====================
```

## 🛠️ Troubleshooting

### Problemas Comunes

#### 1. La tarea no se ejecuta
- **Verificar**: `schtasks /query /tn "GestionColaborativa-Notifications"`
- **Solución**: Recrear la tarea con `scripts\setup-task-simple.bat`

#### 2. Errores de base de datos
- **Verificar**: Conexión en `.env`
- **Log**: Revisar `logs/notifications-YYYYMMDD.log`

#### 3. No se envían emails
- **Verificar**: Configuración SMTP en `.env`
- **Test**: Ejecutar manualmente `node src/scripts/deliverable-notifications.js`

#### 4. Permisos insuficientes
- **Solución**: Ejecutar `scripts\setup-scheduled-task.ps1` como administrador

### Comandos de Diagnóstico

#### Probar script manualmente:
```bash
cd C:\Users\josti\Desktop\GestionColaborativa
node src/scripts/deliverable-notifications.js
```

#### Verificar configuración de email:
```bash
node -e "console.log(require('./src/config/database.js'))"
```

## 🎛️ Personalización

### Modificar Frecuencia de Recordatorios
En `src/scripts/deliverable-notifications.js`, línea 25:
```javascript
AND DATEDIFF(e.fecha_limite, CURDATE()) IN (3, 1)  // Cambiar días de aviso
```

### Modificar Tiempo de Revisión Pendiente
En `src/scripts/deliverable-notifications.js`, línea 85:
```javascript
AND DATEDIFF(CURDATE(), e.fecha_entrega) >= 2  // Cambiar días sin revisión
```

### Cambiar Horario de Ejecución
Editar la tarea programada o recrearla con:
```powershell
.\scripts\setup-scheduled-task.ps1 -ScheduleTime "14:30"  # Para 2:30 PM
```

## Solución de Problemas

### Error: "Cannot find module"
- Verificar que todas las dependencias estén instaladas: `npm install`
- Verificar que el script se ejecute desde el directorio raíz del proyecto

### Error de Base de Datos
- Verificar que la base de datos esté ejecutándose
- Verificar las credenciales en el archivo de configuración

### Notificaciones No Se Envían
- Verificar que el modelo de Notification esté funcionando correctamente
- Revisar los logs para identificar errores específicos

## Archivos Relacionados

- `src/scripts/deliverable-notifications.js` - Script principal
- `src/services/DeliverableNotificationService.js` - Servicio de notificaciones
- `scripts/run-notifications.bat` - Script de ejecución para Windows
- `src/controllers/DeliverableController.js` - Controlador con notificaciones en tiempo real