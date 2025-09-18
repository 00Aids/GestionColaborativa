# Manual de Funcionalidades de Filtrado por Área de Trabajo

## 📋 Descripción General

Este manual describe las nuevas funcionalidades implementadas para el filtrado automático por área de trabajo en el sistema de gestión de proyectos. Las funcionalidades permiten la asignación automática de áreas y el filtrado de contenido basado en el área de trabajo del usuario.

## 🎯 Funcionalidades Implementadas

### 1. **Asignación Automática de Área en Entregables**
- Los entregables heredan automáticamente el área de trabajo del proyecto al que pertenecen
- Funciona cuando se crea un entregable usando el modelo `Deliverable`

### 2. **Middleware de Autenticación por Área**
- Filtra automáticamente el contenido según el área de trabajo del usuario
- Aplica restricciones de acceso basadas en el área

### 3. **Consultas Optimizadas**
- Consultas de administradores por área
- Filtrado de entregables por área de trabajo
- Verificación de integridad de datos

---

## 🧪 Instrucciones de Prueba

### **Prueba 1: Verificación del Sistema Completo**

**Objetivo:** Verificar que todas las tablas y relaciones están correctamente configuradas.

**Pasos:**
1. Ejecutar el script de verificación completa:
   ```bash
   node test_complete_flow.js
   ```

**Resultado esperado:**
- ✅ Verificación de estructura de tablas
- ✅ Verificación de claves foráneas
- ✅ Consulta de administradores por área
- ✅ Mensaje de éxito final

**Qué verifica:**
- Estructura de base de datos
- Relaciones entre tablas
- Consultas con filtros por área

---

### **Prueba 2: Creación de Entregables con Área Automática**

**Objetivo:** Verificar que los entregables heredan automáticamente el área del proyecto.

**Pasos:**
1. Ejecutar el script de prueba de entregables:
   ```bash
   node test_deliverable_model.js
   ```

**Resultado esperado:**
- ✅ Entregable creado con ID específico
- ✅ Mensaje: "¡Éxito! El entregable heredó correctamente el área del proyecto"
- ✅ Lista de entregables filtrados por área

**Qué verifica:**
- Herencia automática de área de trabajo
- Funcionamiento del modelo `Deliverable`
- Consultas con filtros

---

### **Prueba 3: Integración Completa del Sistema**

**Objetivo:** Probar todo el flujo de creación y asignación automática.

**Pasos:**
1. Ejecutar el script de integración completa:
   ```bash
   node test_final_integration.js
   ```

**Resultado esperado:**
- ✅ Verificación de estructura de tablas
- ✅ Creación de administrador
- ✅ Creación de proyecto
- ✅ Creación de entregable con herencia de área
- ✅ Consultas con filtros funcionando
- ✅ Verificación de integridad de datos

**Qué verifica:**
- Flujo completo de creación
- Asignación automática de áreas
- Integridad del sistema

---

## 🔧 Uso en Código

### **Crear Entregable con Área Automática**

```javascript
const Deliverable = require('./src/models/Deliverable');

// Crear instancia del modelo
const deliverableModel = new Deliverable();

// Datos del entregable (sin especificar área)
const deliverableData = {
  titulo: 'Mi Entregable',
  descripcion: 'Descripción del entregable',
  proyecto_id: 30, // ID del proyecto existente
  fase_id: 1,
  fecha_entrega: '2024-12-31',
  estado: 'pendiente'
  // NO incluir area_trabajo_id - se asigna automáticamente
};

// Crear entregable
const newDeliverable = await deliverableModel.create(deliverableData);
// El entregable tendrá automáticamente el área del proyecto
```

### **Consultar Entregables por Área**

```javascript
// Obtener entregables con información de proyecto y área
const filteredDeliverables = await deliverableModel.findWithProject({
  area_trabajo_id: 1 // Filtrar por área específica
});

// Los resultados incluyen información del área de trabajo
filteredDeliverables.forEach(deliverable => {
  console.log(`${deliverable.titulo} - Área: ${deliverable.area_trabajo_codigo}`);
});
```

---

## 📊 Verificación de Resultados

### **Indicadores de Éxito**

1. **Asignación Automática Funcionando:**
   - Mensaje: "¡Éxito! El entregable heredó correctamente el área del proyecto"
   - El `area_trabajo_id` del entregable coincide con el del proyecto

2. **Consultas Funcionando:**
   - Las consultas devuelven resultados filtrados por área
   - Los códigos de área aparecen correctamente en los resultados

3. **Integridad de Datos:**
   - No hay entregables huérfanos (sin área pero con proyecto que sí tiene área)
   - Las relaciones entre tablas están intactas

### **Indicadores de Problemas**

1. **Área No Asignada:**
   - Mensaje: "El entregable no tiene área asignada"
   - `area_trabajo_id` es NULL cuando debería tener un valor

2. **Errores de Consulta:**
   - Errores de columnas desconocidas
   - Fallos en las consultas con JOIN

---

## 🔍 Archivos de Configuración

### **Modelos Principales**

- **`src/models/Deliverable.js`**: Contiene la lógica de asignación automática de área
- **`src/models/User.js`**: Modelo de usuarios con área de trabajo
- **`src/models/Project.js`**: Modelo de proyectos con área de trabajo

### **Middleware**

- **`src/middlewares/areaAuth.js`**: Middleware de autenticación y filtrado por área

### **Scripts de Prueba**

- **`test_complete_flow.js`**: Verificación completa del sistema
- **`test_deliverable_model.js`**: Prueba específica de entregables
- **`test_final_integration.js`**: Prueba de integración completa

---

## 🚨 Solución de Problemas

### **Error: "Unknown column 'at.nombre'"**
**Solución:** La tabla `areas_trabajo` usa `codigo` en lugar de `nombre`. Verificar que las consultas usen `at.codigo`.

### **Error: "Data too long for column"**
**Solución:** Verificar que los valores cumplan con las restricciones de longitud de las columnas.

### **Error: "Data truncated for column 'estado'"**
**Solución:** Usar valores válidos del enum para el estado (ej: 'en_desarrollo', 'borrador', 'aprobado').

### **Entregables sin área automática**
**Solución:** Asegurarse de usar el modelo `Deliverable` para crear entregables, no inserción directa en base de datos.

---

## ✅ Lista de Verificación

Antes de considerar el sistema funcionando correctamente, verificar:

- [ ] Todas las pruebas pasan sin errores
- [ ] Los entregables heredan automáticamente el área del proyecto
- [ ] Las consultas con filtros por área funcionan
- [ ] No hay errores de columnas desconocidas
- [ ] Los códigos de área aparecen correctamente en los resultados
- [ ] La integridad de datos se mantiene

---

## 📞 Soporte

Si encuentras problemas durante las pruebas:

1. Verificar que la base de datos esté actualizada con las migraciones
2. Revisar los logs de error para identificar el problema específico
3. Ejecutar los scripts de verificación individuales para aislar el problema
4. Consultar la estructura de tablas con los scripts `check_*.js`

---

*Manual generado para el sistema de gestión de proyectos - Filtrado por Área de Trabajo*