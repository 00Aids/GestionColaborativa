# Diseño de Nueva Estructura para Asignaciones de Proyecto

## Problema Actual
- La tabla `proyectos` usa campos individuales (`estudiante_id`, `director_id`, `evaluador_id`) que solo permiten UN usuario por rol
- La tabla `proyecto_usuarios` existe pero solo asigna rol "estudiante" por defecto
- El método `addUserToProject` no considera el tipo de usuario real al asignar roles

## Nueva Estructura Propuesta

### 1. Tabla `proyecto_usuarios` (ya existe, necesita mejoras)
```sql
CREATE TABLE proyecto_usuarios (
    id INT PRIMARY KEY AUTO_INCREMENT,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    rol_en_proyecto ENUM('estudiante', 'director', 'coordinador', 'evaluador') NOT NULL,
    fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    activo BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_project_role (proyecto_id, usuario_id, rol_en_proyecto)
);
```

### 2. Modificar tabla `proyectos` (deprecar campos individuales)
- Mantener `estudiante_id`, `director_id`, `evaluador_id` como NULL por compatibilidad
- Agregar columna `usa_asignaciones_multiples BOOLEAN DEFAULT TRUE`
- Eventualmente eliminar estos campos en futuras versiones

### 3. Lógica de Asignación de Roles
El rol en el proyecto se determinará basado en:
- **Tipo de usuario** (`tipo_usuario` en tabla `usuarios`)
- **Contexto de la invitación** (quién invita y para qué rol)

#### Mapeo de Roles:
- `Estudiante` → `estudiante`
- `Director Académico` → `director`
- `Coordinador Académico` → `coordinador`
- `Evaluador` → `evaluador`
- `Administrador General` → puede tener cualquier rol según contexto

### 4. Cambios en el Código

#### A. Método `addUserToProject` mejorado:
```javascript
async addUserToProject(projectId, userId, roleOverride = null) {
    try {
        // Obtener información del usuario
        const user = await this.userModel.findById(userId);
        if (!user) throw new Error('Usuario no encontrado');

        // Determinar rol basado en tipo de usuario o override
        let rol = roleOverride;
        if (!rol) {
            switch (user.tipo_usuario) {
                case 'Estudiante':
                    rol = 'estudiante';
                    break;
                case 'Director Académico':
                    rol = 'director';
                    break;
                case 'Coordinador Académico':
                    rol = 'coordinador';
                    break;
                case 'Evaluador':
                    rol = 'evaluador';
                    break;
                case 'Administrador General':
                    rol = 'director'; // Por defecto, puede ser cambiado
                    break;
                default:
                    rol = 'estudiante';
            }
        }

        // Verificar si ya existe la asignación
        const existingQuery = 'SELECT * FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ? AND rol_en_proyecto = ?';
        const existing = await this.projectModel.query(existingQuery, [projectId, userId, rol]);
        
        if (existing.length === 0) {
            // Insertar nueva asignación
            const insertQuery = 'INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol_en_proyecto, fecha_asignacion) VALUES (?, ?, ?, NOW())';
            await this.projectModel.query(insertQuery, [projectId, userId, rol]);
            
            console.log(`Usuario ${userId} (${user.tipo_usuario}) asignado al proyecto ${projectId} como ${rol}`);
        }

        // Asignar al área de trabajo si es necesario
        const project = await this.projectModel.findById(projectId);
        if (project && project.area_trabajo_id) {
            const userModel = this.userModel;
            const belongsToArea = await userModel.belongsToArea(userId, project.area_trabajo_id);
            if (!belongsToArea) {
                await userModel.assignToArea(userId, project.area_trabajo_id, false, false);
            }
        }
    } catch (error) {
        throw new Error(`Error adding user to project: ${error.message}`);
    }
}
```

#### B. Nuevos métodos para consultar asignaciones:
```javascript
// Obtener todos los usuarios de un proyecto por rol
async getProjectUsersByRole(projectId, role) {
    const query = `
        SELECT u.*, pu.fecha_asignacion, pu.activo
        FROM usuarios u
        JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
        WHERE pu.proyecto_id = ? AND pu.rol_en_proyecto = ? AND pu.activo = TRUE
    `;
    return await this.projectModel.query(query, [projectId, role]);
}

// Obtener todos los proyectos de un usuario por rol
async getUserProjectsByRole(userId, role) {
    const query = `
        SELECT p.*, pu.fecha_asignacion, pu.activo
        FROM proyectos p
        JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol_en_proyecto = ? AND pu.activo = TRUE
    `;
    return await this.projectModel.query(query, [userId, role]);
}
```

### 5. Migración de Datos Existentes
1. Migrar datos de campos individuales a `proyecto_usuarios`
2. Marcar proyectos como `usa_asignaciones_multiples = TRUE`
3. Mantener campos antiguos como NULL para compatibilidad

### 6. Beneficios de la Nueva Estructura
- **Flexibilidad**: Múltiples usuarios por rol
- **Escalabilidad**: Fácil agregar nuevos roles
- **Consistencia**: Una sola fuente de verdad para asignaciones
- **Auditoría**: Fechas de asignación y estado activo/inactivo
- **Compatibilidad**: Transición gradual desde estructura antigua