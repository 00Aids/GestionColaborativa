# 🤖 PROMPT COMPLETO DEL PROYECTO
## Sistema de Gestión Colaborativa Académica

---

## 📋 **CONTEXTO DEL PROYECTO**

Eres un asistente de IA especializado trabajando en un **Sistema de Gestión Colaborativa Académica** desarrollado en **Node.js + Express + MySQL + EJS**. Este es un proyecto universitario para gestionar proyectos de grado e investigación con múltiples roles de usuario.

---

## 🏗️ **ARQUITECTURA Y TECNOLOGÍAS**

### **Stack Tecnológico:**
```javascript
// Backend
- Node.js + Express.js
- MySQL2 (Base de datos)
- EJS (Motor de plantillas)
- bcryptjs (Encriptación)
- express-session (Sesiones)
- multer (Subida archivos)
- nodemailer (Emails)
- helmet + express-rate-limit (Seguridad)

// Frontend
- EJS Templates
- HTML5 + CSS3 + JavaScript
- Bootstrap/CSS personalizado
- Font Awesome (iconos)
```

### **Estructura del Proyecto:**
```
Ejemplotrae/
├── src/
│   ├── config/          # BD y configuración
│   ├── controllers/     # Lógica de negocio
│   ├── models/          # Modelos de datos
│   ├── routes/          # Rutas Express
│   ├── views/           # Plantillas EJS
│   ├── middlewares/     # Middleware personalizado
│   ├── services/        # Servicios (email, notificaciones)
│   └── helpers/         # Funciones auxiliares
├── public/              # Archivos estáticos
├── tests/              # Pruebas
└── docs/               # Documentación
```

---

## 👥 **SISTEMA DE ROLES**

### **Roles Implementados:**
1. **Administrador** - Gestión completa del sistema
2. **Director** - Supervisión de proyectos dirigidos
3. **Coordinador** - Gestión por área de trabajo
4. **Estudiante** - Acceso a sus proyectos
5. **Evaluador** - Evaluación de proyectos asignados

### **Permisos y Funcionalidades por Rol:**
```javascript
// Cada rol tiene:
- Dashboard personalizado
- Funcionalidades específicas
- Permisos diferenciados
- Vistas adaptadas
- Flujos de trabajo únicos
```

---

## 🗄️ **BASE DE DATOS**

### **Tablas Principales:**
```sql
users                 # Usuarios del sistema
projects              # Proyectos académicos
entregables           # Entregables de proyectos
tasks                 # Tareas de proyectos
roles                 # Roles de usuarios
areas_trabajo         # Áreas de trabajo
invitations           # Invitaciones
notifications         # Notificaciones
evaluations           # Evaluaciones
comments              # Comentarios
```

### **Relaciones Clave:**
- Usuarios ↔ Proyectos (many-to-many)
- Proyectos → Entregables (one-to-many)
- Proyectos → Tareas (one-to-many)
- Usuarios → Áreas de trabajo (many-to-one)

---

## 🔄 **FLUJOS DE TRABAJO CRÍTICOS**

### **1. Flujo de Entregables (CRÍTICO):**
```
PENDIENTE → ENTREGADO → EN_REVISION → [ACEPTADO|RECHAZADO|REQUIERE_CAMBIOS]
```

**Proceso:**
1. Estudiante sube entregable (PENDIENTE → ENTREGADO)
2. Coordinador inicia revisión (ENTREGADO → EN_REVISION)
3. Coordinador decide: Aprobar/Rechazar/Solicitar cambios

### **2. Estados de Proyecto:**
```
BORRADOR → EN_DESARROLLO → EN_REVISION → APROBADO → FINALIZADO
```

### **3. Estados de Tarea:**
```
TODO → IN_PROGRESS → DONE
```

---

## 🚨 **PROBLEMAS RESUELTOS RECIENTEMENTE**

### **Error Crítico 1: Sistema de Notificaciones**
```javascript
// PROBLEMA: Cannot read properties of undefined (reading 'findById')
// CAUSA: Método findById faltante en modelo Project
// SOLUCIÓN: Implementado método findById con manejo de errores

// Antes (ERROR):
const project = await Project.findById(projectId); // ❌ Método no existía

// Después (CORREGIDO):
static async findById(id) {
    try {
        const [rows] = await db.execute(
            'SELECT * FROM projects WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    } catch (error) {
        console.error('Error finding project by ID:', error);
        throw error;
    }
}
```

### **Error Crítico 2: DeliverableNotificationService**
```javascript
// PROBLEMA: Uso de columna inexistente 'proyecto_nombre'
// CAUSA: Inconsistencia entre código y esquema BD
// SOLUCIÓN: Corregido para usar 'proyecto_titulo'

// Antes (ERROR):
proyecto_nombre: entregable.proyecto_nombre // ❌ Columna no existe

// Después (CORREGIDO):
proyecto_titulo: entregable.proyecto_titulo // ✅ Columna correcta
```

### **Error Crítico 3: Validaciones de Estado**
```javascript
// PROBLEMA: Transiciones de estado inválidas
// SOLUCIÓN: Validaciones estrictas implementadas

// Validación implementada:
if (nuevoEstado === 'EN_REVISION' && estadoActual !== 'ENTREGADO') {
    return res.status(400).json({
        success: false,
        message: 'Solo se puede iniciar revisión de entregables en estado ENTREGADO'
    });
}
```

---

## 🛠️ **ARCHIVOS CLAVE MODIFICADOS**

### **Modelos:**
- `src/models/Project.js` - Agregado método `findById`
- `src/models/Entregable.js` - Validaciones de estado

### **Controladores:**
- `src/controllers/EntregableController.js` - Validaciones completas
- `src/controllers/DashboardController.js` - Optimizaciones
- `src/controllers/ProjectController.js` - Mejoras

### **Servicios:**
- `src/services/DeliverableNotificationService.js` - Corrección crítica

### **Vistas (EJS):**
- `src/views/coordinator/deliverable-detail.ejs` - Lógica condicional
- `src/views/coordinator/deliverables.ejs` - Botones contextuales
- `src/views/director/deliverable-detail.ejs` - Validaciones
- `src/views/director/deliverables.ejs` - Mejoras UX

---

## 🧪 **METODOLOGÍA DE TESTING**

### **Proceso de Pruebas:**
1. **Análisis de errores** mediante logs y debugging
2. **Identificación de causas** raíz
3. **Implementación de soluciones** puntuales
4. **Testing integral** de flujos completos
5. **Validación** de correcciones
6. **Documentación** de cambios

### **Tipos de Pruebas Realizadas:**
```javascript
// Pruebas de modelos
- Conexión a BD ✅
- Métodos CRUD ✅
- Validaciones ✅

// Pruebas de controladores
- Rutas principales ✅
- Manejo de errores ✅
- Validaciones de entrada ✅

// Pruebas de servicios
- Notificaciones ✅
- Email ✅
- Archivos ✅

// Pruebas de integración
- Flujos completos ✅
- Estados de entregables ✅
- Permisos por rol ✅
```

---

## 📊 **ESTADO ACTUAL DEL PROYECTO**

### **Funcionalidades 100% Operativas:**
```
✅ Sistema de autenticación y autorización
✅ Dashboard multi-rol personalizado
✅ Gestión completa de proyectos
✅ Sistema de entregables con flujo completo
✅ Sistema de notificaciones estable
✅ Gestión de usuarios y permisos
✅ Subida y gestión de archivos
✅ Reportes y métricas por rol
✅ Sistema de comentarios
✅ Validaciones de seguridad
```

### **Métricas del Proyecto:**
- **~15,000 líneas** de código
- **~200 archivos** en total
- **8 controladores** principales
- **10 modelos** de datos
- **50+ vistas** EJS
- **5 roles** de usuario implementados

---

## 🔧 **COMANDOS Y CONFIGURACIÓN**

### **Comandos de Desarrollo:**
```bash
# Instalación
npm install

# Desarrollo
npm run dev

# Producción
npm start

# Testing
npm test
```

### **Variables de Entorno Requeridas:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=proyecto_db
SESSION_SECRET=secret_key
EMAIL_USER=email@domain.com
EMAIL_PASS=email_password
```

---

## 📚 **DOCUMENTACIÓN GENERADA**

### **Archivos de Documentación:**
1. `INFORME_COMPLETO_PROYECTO.md` - Informe técnico completo
2. `INFORME_CAMBIOS_ENTREGABLES.md` - Cambios recientes detallados
3. `RESUMEN_PROYECTO.txt` - Resumen técnico original
4. `DOCUMENTACION_FLUJO_ENTREGABLES.md` - Flujos de trabajo
5. `TESTING_INTEGRAL_RESULTS.md` - Resultados de pruebas

---

## 🎯 **INSTRUCCIONES PARA FUTURO DESARROLLO**

### **Al trabajar en este proyecto:**

1. **SIEMPRE revisar** el estado actual de los flujos de entregables
2. **VALIDAR** que las transiciones de estado sean correctas
3. **PROBAR** el sistema de notificaciones después de cambios
4. **MANTENER** la consistencia en validaciones por rol
5. **DOCUMENTAR** todos los cambios realizados

### **Patrones de Código a Seguir:**
```javascript
// Estructura de controlador
exports.metodo = async (req, res) => {
    try {
        // Validaciones
        // Lógica de negocio
        // Respuesta
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ success: false, message: 'Error interno' });
    }
};

// Estructura de modelo
static async metodo(params) {
    try {
        const [rows] = await db.execute(query, params);
        return rows;
    } catch (error) {
        console.error('Error en modelo:', error);
        throw error;
    }
}
```

### **Validaciones Críticas:**
```javascript
// SIEMPRE validar estados antes de transiciones
if (estadoActual !== estadoEsperado) {
    return res.status(400).json({
        success: false,
        message: 'Transición de estado inválida'
    });
}

// SIEMPRE validar permisos por rol
if (!req.user || req.user.rol !== 'COORDINADOR') {
    return res.status(403).json({
        success: false,
        message: 'Permisos insuficientes'
    });
}
```

---

## 🚀 **PRÓXIMOS PASOS SUGERIDOS**

1. **Implementar API REST** para aplicaciones móviles
2. **Agregar sistema de chat** en tiempo real
3. **Integrar con servicios externos** (Google Drive, etc.)
4. **Optimizar rendimiento** para gran escala
5. **Implementar sistema de backup** automático

---

## 💡 **CONSEJOS PARA MANTENIMIENTO**

### **Debugging:**
- Revisar logs en consola para errores
- Verificar conexión a BD
- Validar estructura de datos
- Comprobar permisos de archivos

### **Optimización:**
- Monitorear consultas SQL lentas
- Optimizar carga de imágenes
- Implementar caché donde sea necesario
- Revisar uso de memoria

### **Seguridad:**
- Mantener dependencias actualizadas
- Revisar logs de seguridad
- Validar todas las entradas de usuario
- Monitorear intentos de acceso no autorizado

---

*Este prompt contiene toda la información necesaria para continuar el desarrollo y mantenimiento del Sistema de Gestión Colaborativa Académica.*

**Versión:** 1.2.0  
**Última actualización:** Enero 2025  
**Estado:** Producción Ready