const BaseModel = require('./BaseModel');
const Notification = require('./Notification');

class Entregable extends BaseModel {
    constructor() {
        super('entregables');
        this.notificationModel = new Notification();
    }

    // Crear entregable
    async create(entregableData) {
        try {
            entregableData.created_at = new Date();
            entregableData.updated_at = new Date();
            
            // Si no se especifica area_trabajo_id, obtenerlo del proyecto
            if (!entregableData.area_trabajo_id && entregableData.proyecto_id) {
                const Project = require('./Project');
                const projectModel = new Project();
                const project = await projectModel.findById(entregableData.proyecto_id);
                if (project && project.area_trabajo_id) {
                    entregableData.area_trabajo_id = project.area_trabajo_id;
                }
            }
            
            return await super.create(entregableData);
        } catch (error) {
            throw new Error(`Error creating entregable: ${error.message}`);
        }
    }

    // Obtener entregables con información completa del proyecto y usuario asignado
    async findWithDetails(conditions = {}) {
        try {
            let query = `
                SELECT 
                    e.*,
                    CONCAT('ENT-', LPAD(e.id, 4, '0')) as codigo,
                    p.titulo as proyecto_titulo,
                    p.titulo as proyecto_nombre,
                    p.id as proyecto_id,
                    p.estado as proyecto_estado,
                    u.nombres as estudiante_nombres,
                    u.apellidos as estudiante_apellidos,
                    u.email as estudiante_email,
                    u.foto_perfil as estudiante_avatar,
                    fp.nombre as fase_nombre,
                    fp.descripcion as fase_descripcion,
                    at.codigo as area_trabajo_codigo,
                    at.codigo as area_trabajo_nombre,
                    e.prioridad,
                    e.estado_workflow
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
                WHERE 1=1
            `;
            
            const values = [];
            
            if (Object.keys(conditions).length > 0) {
                const whereConditions = Object.keys(conditions)
                    .map(key => {
                        if (key === 'area_trabajo_id') {
                            return `e.area_trabajo_id = ?`;
                        }
                        return `e.${key} = ?`;
                    })
                    .join(' AND ');
                query += ` AND ${whereConditions}`;
                values.push(...Object.values(conditions));
            }
            
            query += ` ORDER BY e.fecha_limite ASC, e.fecha_entrega ASC`;
            
            const [rows] = await this.db.execute(query, values);
            return rows;
        } catch (error) {
            throw new Error(`Error finding entregables with details: ${error.message}`);
        }
    }

    // Obtener entregables agrupados por estado para el Kanban
    async getKanbanData(conditions = {}) {
        try {
            const entregables = await this.findWithDetails(conditions);
            
            return {
                pendiente: entregables.filter(e => e.estado === 'pendiente' || e.estado_workflow === 'todo'),
                en_progreso: entregables.filter(e => e.estado === 'en_progreso' || e.estado_workflow === 'in_progress'),
                entregado: entregables.filter(e => e.estado === 'entregado' || e.estado_workflow === 'review'),
                completado: entregables.filter(e => ['aprobado', 'revisado', 'aceptado'].includes(e.estado) || e.estado_workflow === 'done')
            };
        } catch (error) {
            throw new Error(`Error getting kanban data: ${error.message}`);
        }
    }

    // Obtener entregables con información del proyecto
    async findWithProject(conditions = {}) {
        try {
            let query = `
                SELECT 
                    e.*,
                    p.titulo as proyecto_titulo,
                    p.estado as proyecto_estado,
                    u.nombres as estudiante_nombres,
                    u.apellidos as estudiante_apellidos,
                    fp.nombre as fase_nombre,
                    fp.descripcion as fase_descripcion,
                    at.codigo as area_trabajo_codigo
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
                WHERE 1=1
            `;
            
            const values = [];
            
            if (Object.keys(conditions).length > 0) {
                const whereConditions = Object.keys(conditions)
                    .map(key => {
                        if (key === 'area_trabajo_id') {
                            return `e.area_trabajo_id = ?`;
                        }
                        return `e.${key} = ?`;
                    })
                    .join(' AND ');
                query += ` AND ${whereConditions}`;
                values.push(...Object.values(conditions));
            }
            
            query += ` ORDER BY e.fecha_entrega ASC`;
            
            const [rows] = await this.db.execute(query, values);
            return rows;
        } catch (error) {
            throw new Error(`Error finding entregables with project: ${error.message}`);
        }
    }

    // Obtener entregables por proyecto
    async findByProject(projectId) {
        try {
            return await this.findWithProject({ proyecto_id: projectId });
        } catch (error) {
            throw new Error(`Error finding entregables by project: ${error.message}`);
        }
    }

    // Obtener entregables por estado
    async findByStatus(estado) {
        try {
            return await this.findWithDetails({ estado });
        } catch (error) {
            throw new Error(`Error finding entregables by status: ${error.message}`);
        }
    }

    // Obtener entregables por estudiante
    async findByStudent(studentId) {
        try {
            const query = `
                SELECT DISTINCT
                    e.*,
                    p.titulo as proyecto_titulo,
                    p.estado as proyecto_estado,
                    fp.nombre as fase_nombre,
                    at.codigo as area_trabajo_codigo
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
                LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                WHERE (pu.usuario_id = ? AND pu.estado = 'activo') 
                   OR e.asignado_a = ?
                ORDER BY e.fecha_limite ASC, e.fecha_entrega ASC
            `;
            
            const [rows] = await this.db.execute(query, [studentId, studentId]);
            return rows;
        } catch (error) {
            throw new Error(`Error finding entregables by student: ${error.message}`);
        }
    }

    // Obtener entregables de proyectos asignados al coordinador para revisión
    async findByCoordinatorForReview(coordinatorId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    p.titulo as proyecto_titulo,
                    p.estado as proyecto_estado,
                    u.nombres as estudiante_nombres,
                    u.apellidos as estudiante_apellidos,
                    fp.nombre as fase_nombre
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
                ORDER BY e.fecha_entrega DESC
            `;
            
            const [rows] = await this.db.execute(query, [coordinatorId]);
            return rows;
        } catch (error) {
            throw new Error(`Error finding entregables by coordinator for review: ${error.message}`);
        }
    }

    // Asignar entregable a usuario específico
    async assignToUser(entregableId, userId, assignedBy) {
        try {
            // Actualizar el entregable con el usuario asignado
            const query = `
                UPDATE entregables 
                SET 
                    asignado_a = ?,
                    observaciones = JSON_SET(
                        COALESCE(observaciones, '{}'), 
                        '$.asignado_por', ?,
                        '$.fecha_asignacion', NOW()
                    ),
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [userId, assignedBy, entregableId]);
            
            if (result.affectedRows > 0) {
                // Obtener información del entregable para la notificación
                const entregable = await this.findById(entregableId);
                
                // Crear notificación para el usuario asignado
                await this.notificationModel.createForUser(userId, {
                    titulo: 'Nuevo entregable asignado',
                    mensaje: `Se te ha asignado el entregable: ${entregable.titulo}`,
                    tipo: 'info',
                    url_accion: `/entregables/${entregableId}`
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            throw new Error(`Error assigning entregable to user: ${error.message}`);
        }
    }

    // Asignar entregable a todos los usuarios de un rol específico
    async assignToRole(entregableId, roleId, assignedBy) {
        try {
            // Obtener usuarios del rol
            const query = `
                SELECT u.id, u.nombres, u.apellidos 
                FROM usuarios u 
                WHERE u.rol_id = ? AND u.activo = 1
            `;
            
            const [users] = await this.db.execute(query, [roleId]);
            const assignments = [];
            
            // Obtener información del entregable
            const entregable = await this.findById(entregableId);
            
            for (const user of users) {
                // Asignar a cada usuario
                const assigned = await this.assignToUser(entregableId, user.id, assignedBy);
                if (assigned) {
                    assignments.push({
                        userId: user.id,
                        userName: `${user.nombres} ${user.apellidos}`
                    });
                }
            }
            
            return assignments;
        } catch (error) {
            throw new Error(`Error assigning entregable to role: ${error.message}`);
        }
    }

    // Obtener entregables asignados a un usuario
    async getAssignedToUser(userId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    CONCAT('ENT-', LPAD(e.id, 4, '0')) as codigo,
                    p.titulo as proyecto_titulo,
                    p.id as proyecto_id,
                    fp.nombre as fase_nombre,
                    JSON_EXTRACT(e.observaciones, '$.asignado_por') as asignado_por_id,
                    u2.nombres as asignado_por_nombres,
                    u2.apellidos as asignado_por_apellidos
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN usuarios u2 ON JSON_EXTRACT(e.observaciones, '$.asignado_por') = u2.id
                WHERE e.asignado_a = ?
                ORDER BY e.fecha_limite ASC
            `;
            
            const [rows] = await this.db.execute(query, [userId]);
            return rows;
        } catch (error) {
            throw new Error(`Error getting entregables assigned to user: ${error.message}`);
        }
    }

    // Actualizar estado del workflow
    async updateWorkflowStatus(entregableId, newStatus, userId) {
        try {
            const query = `
                UPDATE entregables 
                SET estado_workflow = ?, updated_at = NOW() 
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [newStatus, entregableId]);
            
            if (result.affectedRows > 0) {
                // Registrar en historial
                await this.addToHistory(entregableId, userId, 'estado_workflow_actualizado', {
                    campo: 'estado_workflow',
                    valor_nuevo: newStatus,
                    descripcion: `Estado del workflow actualizado a: ${newStatus}`
                });
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating workflow status: ${error.message}`);
        }
    }

    // Completar entregable
    async complete(entregableId, userId, completionData = {}) {
        try {
            const query = `
                UPDATE entregables 
                SET 
                    estado = 'completado',
                    estado_workflow = 'done',
                    fecha_entrega = NOW(),
                    observaciones = JSON_SET(
                        COALESCE(observaciones, '{}'), 
                        '$.completado_por', ?,
                        '$.fecha_completado', NOW(),
                        '$.datos_completado', ?
                    ),
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [
                userId, 
                JSON.stringify(completionData), 
                entregableId
            ]);
            
            if (result.affectedRows > 0) {
                // Registrar en historial
                await this.addToHistory(entregableId, userId, 'entregable_completado', {
                    descripcion: 'Entregable marcado como completado'
                });
                
                // Obtener información del entregable para notificaciones
                const entregable = await this.findById(entregableId);
                
                // Notificar al coordinador del área
                if (entregable.area_trabajo_id) {
                    await this.notificationModel.createForRole('coordinador', {
                        titulo: 'Entregable completado',
                        mensaje: `El entregable "${entregable.titulo}" ha sido completado`,
                        tipo: 'success',
                        url_accion: `/coordinator/entregables/${entregableId}`
                    });
                }
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error completing entregable: ${error.message}`);
        }
    }

    // Actualizar estado con workflow
    async updateStatusWithWorkflow(entregableId, newStatus, observaciones = null, userId = null) {
        try {
            // Obtener estado actual
            const entregable = await this.findById(entregableId);
            if (!entregable) {
                throw new Error('Entregable no encontrado');
            }

            // Preparar datos de actualización
            const updateData = {
                estado: newStatus,
                updated_at: new Date()
            };
            
            if (observaciones) {
                updateData.observaciones = observaciones;
            }

            // Acciones específicas por estado
            switch (newStatus) {
                case 'entregado':
                    // Actualizar fecha_entrega cuando el estudiante entrega
                    updateData.fecha_entrega = new Date();
                    break;
                case 'en_revision':
                    // No necesitamos una columna específica para fecha_revision
                    // Se puede usar updated_at para tracking
                    break;
                case 'aceptado':
                case 'completado':
                    // Mantener la fecha_entrega original del estudiante
                    break;
            }

            // Actualizar entregable
            const result = await this.update(entregableId, updateData);

            // Si hay observaciones y userId, guardarlas como comentario
            if (observaciones && observaciones.trim() && userId) {
                let comentarioTexto = '';
                
                // Agregar contexto según el estado
                switch (newStatus) {
                    case 'aceptado':
                        comentarioTexto = `✅ **Entregable aprobado**\n\n${observaciones}`;
                        break;
                    case 'rechazado':
                        comentarioTexto = `❌ **Entregable rechazado**\n\n${observaciones}`;
                        break;
                    case 'requiere_cambios':
                        comentarioTexto = `🔄 **Se solicitan cambios**\n\n${observaciones}`;
                        break;
                    default:
                        comentarioTexto = `📝 **Observaciones del cambio de estado**\n\n${observaciones}`;
                        break;
                }
                
                await this.addComment(entregableId, userId, comentarioTexto);
            }

            return result;
        } catch (error) {
            throw new Error(`Error updating entregable status with workflow: ${error.message}`);
        }
    }

    // Obtener entregable por ID con detalles completos
    async findByIdWithDetails(entregableId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    e.archivo_url as archivos_originales,
                    e.archivos_adjuntos as archivos_entregados,
                    p.titulo as proyecto_titulo,
                    p.estado as proyecto_estado,
                    p.descripcion as proyecto_descripcion,
                    u.nombres as estudiante_nombres,
                    u.apellidos as estudiante_apellidos,
                    u.email as estudiante_email,
                    director.nombres as director_nombres,
                    director.apellidos as director_apellidos,
                    director.email as director_email,
                    fp.nombre as fase_nombre,
                    fp.descripcion as fase_descripcion,
                    at.codigo as area_trabajo_codigo,
                    at.codigo as area_trabajo_nombre,
                    DATEDIFF(e.fecha_limite, NOW()) as dias_restantes,
                    (SELECT COUNT(*) FROM entregable_comentarios ec WHERE ec.entregable_id = e.id) as total_comentarios
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                LEFT JOIN usuarios director ON p.director_id = director.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
                WHERE e.id = ?
            `;
            
            const [rows] = await this.db.execute(query, [entregableId]);
            
            if (rows.length > 0) {
                const entregable = rows[0];
                
                // Procesar archivos de referencia desde observaciones (archivos que se adjuntan al crear la tarea)
                let archivos_referencia = [];
                if (entregable.observaciones) {
                    try {
                        const observaciones = typeof entregable.observaciones === 'string' 
                            ? JSON.parse(entregable.observaciones) 
                            : entregable.observaciones;
                        
                        if (observaciones && observaciones.archivos_adjuntos && Array.isArray(observaciones.archivos_adjuntos)) {
                            archivos_referencia = observaciones.archivos_adjuntos.map(archivo => ({
                                ...archivo,
                                tipo: 'referencia',
                                url: `/uploads/deliverables/${archivo.nombre_archivo}`,
                                nombre: archivo.nombre_original || archivo.nombre_archivo
                            }));
                        }
                    } catch (error) {
                        console.warn('Error procesando archivos de referencia desde observaciones:', error);
                    }
                }
                
                // Procesar archivos originales (archivo_url) - Archivos legacy o adicionales
                if (entregable.archivos_originales) {
                    try {
                        // Si es una cadena separada por comas, convertir a array
                        if (typeof entregable.archivos_originales === 'string') {
                            const archivosLegacy = entregable.archivos_originales
                                .split(',')
                                .map(url => url.trim())
                                .filter(url => url.length > 0)
                                .map(url => ({
                                    url: url,
                                    nombre: url.split('/').pop(),
                                    tipo: 'referencia'
                                }));
                            
                            // Combinar con archivos de referencia
                            archivos_referencia = [...archivos_referencia, ...archivosLegacy];
                        }
                    } catch (error) {
                        console.warn('Error procesando archivos originales:', error);
                    }
                }
                
                // Asignar archivos de referencia
                entregable.archivos_referencia = archivos_referencia;
                entregable.archivos_originales = archivos_referencia; // Para compatibilidad
                
                // Procesar archivos entregados (archivos_adjuntos) - Los archivos que el estudiante subió como entrega
                if (entregable.archivos_entregados) {
                    try {
                        // Si es una cadena JSON, parsear
                        if (typeof entregable.archivos_entregados === 'string') {
                            entregable.archivos_entregados = JSON.parse(entregable.archivos_entregados);
                        }
                        
                        // Asegurar que sea un array y agregar tipo
                        if (Array.isArray(entregable.archivos_entregados)) {
                            entregable.archivos_entregados = entregable.archivos_entregados.map(archivo => ({
                                ...archivo,
                                tipo: 'entregado',
                                url: `/uploads/deliverables/${archivo.nombre_archivo}`,
                                nombre_original: archivo.nombre_original || archivo.nombre_archivo || archivo.nombre || 'Archivo sin nombre'
                            }));
                        } else {
                            entregable.archivos_entregados = [];
                        }
                    } catch (error) {
                        console.warn('Error procesando archivos entregados:', error);
                        entregable.archivos_entregados = [];
                    }
                } else {
                    entregable.archivos_entregados = [];
                }
                
                return entregable;
            }
            
            return null;
        } catch (error) {
            throw new Error(`Error finding entregable by ID with details: ${error.message}`);
        }
    }

    // Agregar comentario al entregable
    async addComment(entregableId, userId, comment, attachments = []) {
        try {
            const query = `
                INSERT INTO entregable_comentarios (
                    entregable_id, usuario_id, comentario, tipo, es_publico, created_at
                ) VALUES (?, ?, ?, 'feedback', 1, NOW())
            `;
            
            const [result] = await this.db.execute(query, [
                entregableId, 
                userId, 
                comment
            ]);
            
            if (result.insertId) {
                // Registrar en historial
                await this.addToHistory(entregableId, userId, 'comentario_agregado', {
                    descripcion: 'Nuevo comentario agregado al entregable'
                });
                
                // Notificar a los involucrados
                const entregable = await this.findById(entregableId);
                if (entregable.asignado_a && entregable.asignado_a !== userId) {
                    await this.notificationModel.createForUser(entregable.asignado_a, {
                        titulo: 'Nuevo comentario en entregable',
                        mensaje: `Hay un nuevo comentario en el entregable: ${entregable.titulo}`,
                        tipo: 'info',
                        url_accion: `/entregables/${entregableId}`
                    });
                }
            }
            
            return result.insertId;
        } catch (error) {
            throw new Error(`Error adding comment: ${error.message}`);
        }
    }

    // Obtener comentarios del entregable
    async getComments(entregableId) {
        try {
            const query = `
                SELECT 
                    c.*,
                    u.nombres,
                    u.apellidos,
                    u.foto_perfil
                FROM entregable_comentarios c
                LEFT JOIN usuarios u ON c.usuario_id = u.id
                WHERE c.entregable_id = ?
                ORDER BY c.created_at ASC
            `;
            
            const [rows] = await this.db.execute(query, [entregableId]);
            return rows;
        } catch (error) {
            throw new Error(`Error getting comments: ${error.message}`);
        }
    }

    // Agregar al historial
    async addToHistory(entregableId, userId, accion, detalles = {}) {
        try {
            // Obtener el entregable para conseguir el area_trabajo_id del proyecto
            const entregable = await this.findById(entregableId);
            if (!entregable) {
                return null; // Si no existe el entregable, no registrar historial
            }

            // Obtener el proyecto para conseguir el area_trabajo_id
            const Project = require('./Project');
            const projectModel = new Project();
            const project = await projectModel.findById(entregable.proyecto_id);
            if (!project || !project.area_trabajo_id) {
                return null; // Si no hay área de trabajo, no registrar historial
            }

            const query = `
                INSERT INTO historial_area_trabajo (
                    area_trabajo_id, usuario_id, accion, entidad_tipo, entidad_id, 
                    descripcion, datos_nuevos, created_at
                ) VALUES (?, ?, ?, 'entregable', ?, ?, ?, NOW())
            `;
            
            const [result] = await this.db.execute(query, [
                project.area_trabajo_id,
                userId, 
                accion,
                entregableId,
                detalles.descripcion || `Acción: ${accion}`,
                JSON.stringify(detalles)
            ]);
            
            return result.insertId;
        } catch (error) {
            // No lanzar error para evitar que falle el proceso principal
            console.error(`Error adding to history: ${error.message}`);
            return null;
        }
    }

    // Obtener historial del entregable
    async getHistory(entregableId) {
        try {
            const query = `
                SELECT 
                    h.*,
                    u.nombres,
                    u.apellidos
                FROM historial_area_trabajo h
                LEFT JOIN usuarios u ON h.usuario_id = u.id
                WHERE h.entidad_tipo = 'entregable' AND h.entidad_id = ?
                ORDER BY h.created_at DESC
            `;
            
            const [rows] = await this.db.execute(query, [entregableId]);
            return rows;
        } catch (error) {
            console.error(`Error getting history: ${error.message}`);
            return []; // Retornar array vacío en lugar de lanzar error
        }
    }

    // Obtener resumen del workflow por área
    async getWorkflowSummary(areaTrabajoId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                    SUM(CASE WHEN estado = 'en_progreso' THEN 1 ELSE 0 END) as en_progreso,
                    SUM(CASE WHEN estado = 'entregado' THEN 1 ELSE 0 END) as entregados,
                    SUM(CASE WHEN estado IN ('aprobado', 'aceptado') THEN 1 ELSE 0 END) as aprobados,
                    SUM(CASE WHEN estado = 'requiere_cambios' THEN 1 ELSE 0 END) as requiere_cambios,
                    SUM(CASE WHEN fecha_limite < NOW() AND estado NOT IN ('aprobado', 'aceptado') THEN 1 ELSE 0 END) as vencidos
                FROM entregables 
                WHERE area_trabajo_id = ?
            `;
            
            const [rows] = await this.db.execute(query, [areaTrabajoId]);
            return rows[0] || {};
        } catch (error) {
            throw new Error(`Error getting workflow summary: ${error.message}`);
        }
    }
}

module.exports = Entregable;