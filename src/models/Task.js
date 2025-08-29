const BaseModel = require('./BaseModel');
const Notification = require('./Notification');

class Task extends BaseModel {
    constructor() {
        super('entregables');
        this.notificationModel = new Notification();
    }

    // Obtener tareas con información del proyecto y usuario asignado
    async findWithDetails() {
        try {
            const query = `
                SELECT 
                    e.*,
                    CONCAT('TASK-', LPAD(e.id, 4, '0')) as codigo,
                    p.titulo as proyecto_titulo,
                    p.titulo as proyecto_nombre,
                    p.id as proyecto_id,
                    u.nombres as asignado_nombre,
                    u.apellidos as asignado_apellido,
                    u.email as asignado_email,
                    u.foto_perfil as asignado_avatar,
                    fp.nombre as fase_nombre,
                    fp.nombre as tipo,
                    e.prioridad
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                ORDER BY e.fecha_limite ASC
            `;
            
            const [rows] = await this.db.execute(query);
            return rows;
        } catch (error) {
            throw new Error(`Error finding tasks with details: ${error.message}`);
        }
    }

    // Obtener tareas agrupadas por estado para el Kanban
    async getKanbanData() {
        try {
            const tasks = await this.findWithDetails();
            
            return {
                por_hacer: tasks.filter(t => t.estado === 'pendiente'),
                en_progreso: tasks.filter(t => t.estado === 'entregado'),
                completado: tasks.filter(t => ['aprobado', 'revisado'].includes(t.estado))
            };
        } catch (error) {
            throw new Error(`Error getting kanban data: ${error.message}`);
        }
    }

    // Crear nueva tarea
    async createTask(taskData) {
        try {
            const {
                proyecto_id,
                fase_id,
                titulo,
                descripcion,
                fecha_limite,
                prioridad = 'medium',
                tipo_enfoque = 'feature'
            } = taskData;

            const query = `
                INSERT INTO entregables (
                    proyecto_id, fase_id, titulo, descripcion, 
                    fecha_limite, prioridad, estado, observaciones
                ) VALUES (?, ?, ?, ?, ?, ?, 'pendiente', ?)
            `;
            
            const [result] = await this.db.execute(query, [
                proyecto_id, fase_id, titulo, descripcion, 
                fecha_limite, prioridad, JSON.stringify({tipo_enfoque})
            ]);
            
            return result.insertId;
        } catch (error) {
            throw new Error(`Error creating task: ${error.message}`);
        }
    }

    // Asignar tarea a usuario específico
    async assignToUser(taskId, userId, assignedBy) {
        try {
            // Actualizar la tarea con el usuario asignado
            const query = `
                UPDATE entregables 
                SET 
                    observaciones = JSON_SET(
                        COALESCE(observaciones, '{}'), 
                        '$.asignado_a', ?,
                        '$.asignado_por', ?,
                        '$.fecha_asignacion', NOW()
                    ),
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [userId, assignedBy, taskId]);
            
            if (result.affectedRows > 0) {
                // Obtener información de la tarea para la notificación
                const task = await this.findById(taskId);
                
                // Crear notificación para el usuario asignado
                await this.notificationModel.createForUser(userId, {
                    titulo: 'Nueva tarea asignada',
                    mensaje: `Se te ha asignado la tarea: ${task.titulo}`,
                    tipo: 'info',
                    url_accion: `/dashboard/tasks/${taskId}`
                });
                
                return true;
            }
            
            return false;
        } catch (error) {
            throw new Error(`Error assigning task to user: ${error.message}`);
        }
    }

    // Asignar tarea a todos los usuarios de un rol específico
    async assignToRole(taskId, roleId, assignedBy) {
        try {
            // Obtener usuarios del rol
            const query = `
                SELECT u.id, u.nombres, u.apellidos 
                FROM usuarios u 
                WHERE u.rol_id = ? AND u.activo = 1
            `;
            
            const [users] = await this.db.execute(query, [roleId]);
            const assignments = [];
            
            // Obtener información de la tarea
            const task = await this.findById(taskId);
            
            for (const user of users) {
                // Asignar a cada usuario
                const assigned = await this.assignToUser(taskId, user.id, assignedBy);
                if (assigned) {
                    assignments.push({
                        userId: user.id,
                        userName: `${user.nombres} ${user.apellidos}`
                    });
                }
            }
            
            return assignments;
        } catch (error) {
            throw new Error(`Error assigning task to role: ${error.message}`);
        }
    }

    // Obtener tareas asignadas a un usuario
    async getAssignedToUser(userId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    CONCAT('TASK-', LPAD(e.id, 4, '0')) as codigo,
                    p.titulo as proyecto_titulo,
                    p.id as proyecto_id,
                    fp.nombre as fase_nombre,
                    JSON_EXTRACT(e.observaciones, '$.asignado_por') as asignado_por_id,
                    JSON_EXTRACT(e.observaciones, '$.fecha_asignacion') as fecha_asignacion,
                    e.prioridad
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                WHERE JSON_EXTRACT(e.observaciones, '$.asignado_a') = ?
                ORDER BY 
                    CASE e.prioridad 
                        WHEN 'high' THEN 1 
                        WHEN 'medium' THEN 2 
                        WHEN 'low' THEN 3 
                        WHEN 'info' THEN 4 
                        ELSE 5 
                    END,
                    e.fecha_limite ASC
            `;
            
            const [rows] = await this.db.execute(query, [userId]);
            return rows;
        } catch (error) {
            throw new Error(`Error getting assigned tasks: ${error.message}`);
        }
    }

    // Notificar cambio de estado de tarea
    async notifyStatusChange(taskId, newStatus, changedBy) {
        try {
            const task = await this.findById(taskId);
            const assignedUserId = JSON.parse(task.observaciones || '{}').asignado_a;
            
            if (assignedUserId) {
                const statusMessages = {
                    'pendiente': 'Tu tarea ha sido marcada como pendiente',
                    'entregado': 'Tu tarea ha sido marcada como entregada',
                    'aprobado': 'Tu tarea ha sido aprobada',
                    'revisado': 'Tu tarea ha sido revisada'
                };
                
                await this.notificationModel.createForUser(assignedUserId, {
                    titulo: 'Estado de tarea actualizado',
                    mensaje: statusMessages[newStatus] || `El estado de tu tarea ha cambiado a: ${newStatus}`,
                    tipo: newStatus === 'aprobado' ? 'success' : 'info',
                    url_accion: `/dashboard/tasks/${taskId}`
                });
            }
        } catch (error) {
            console.error('Error notifying status change:', error.message);
        }
    }

    // Actualizar estado de tarea con notificación
    async updateStatus(taskId, newStatus, changedBy = null) {
        try {
            const query = `
                UPDATE entregables 
                SET estado = ?, updated_at = NOW() 
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [newStatus, taskId]);
            
            if (result.affectedRows > 0 && changedBy) {
                // Notificar el cambio de estado
                await this.notifyStatusChange(taskId, newStatus, changedBy);
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating task status: ${error.message}`);
        }
    }

    // =============================================
    // MÉTODOS PARA WORKFLOW TIPO JIRA
    // =============================================

    // Actualizar estado de workflow (todo, in_progress, done)
    async updateWorkflowStatus(taskId, newWorkflowStatus, userId) {
        try {
            const query = `
                UPDATE entregables 
                SET estado_workflow = ?, updated_at = NOW() 
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [newWorkflowStatus, taskId]);
            
            if (result.affectedRows > 0) {
                // Registrar en historial
                await this.addToHistory(taskId, userId, 'estado_workflow_cambiado', {
                    campo: 'estado_workflow',
                    valor_nuevo: newWorkflowStatus,
                    descripcion: `Estado de workflow cambiado a ${newWorkflowStatus}`
                });
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating workflow status: ${error.message}`);
        }
    }

    // Asignar tarea a usuario (nuevo método para workflow)
    async assignTaskToUser(taskId, userId, assignedBy) {
        try {
            const query = `
                UPDATE entregables 
                SET asignado_a = ?, updated_at = NOW() 
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [userId, taskId]);
            
            if (result.affectedRows > 0) {
                // Registrar en historial
                await this.addToHistory(taskId, assignedBy, 'tarea_asignada', {
                    campo: 'asignado_a',
                    valor_nuevo: userId,
                    descripcion: `Tarea asignada al usuario ID: ${userId}`
                });

                // Crear notificación
                const task = await this.findById(taskId);
                await this.notificationModel.createForUser(userId, {
                    titulo: 'Nueva tarea asignada',
                    mensaje: `Se te ha asignado la tarea: ${task.titulo}`,
                    tipo: 'info',
                    url_accion: `/admin/projects/${task.proyecto_id}/tasks/kanban`
                });
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error assigning task: ${error.message}`);
        }
    }

    // Completar tarea con archivos y descripción
    async completeTask(taskId, completionData, userId) {
        try {
            const {
                desarrollo_descripcion,
                archivos_adjuntos = [],
                horas_trabajadas = 0
            } = completionData;

            const query = `
                UPDATE entregables 
                SET 
                    estado_workflow = 'done',
                    completado_por = ?,
                    fecha_completado = NOW(),
                    desarrollo_descripcion = ?,
                    archivos_adjuntos = ?,
                    horas_trabajadas = ?,
                    updated_at = NOW()
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [
                userId,
                desarrollo_descripcion,
                JSON.stringify(archivos_adjuntos),
                horas_trabajadas,
                taskId
            ]);
            
            if (result.affectedRows > 0) {
                // Registrar en historial
                await this.addToHistory(taskId, userId, 'tarea_completada', {
                    campo: 'estado_workflow',
                    valor_nuevo: 'done',
                    descripcion: 'Tarea marcada como completada'
                });

                // Verificar si todas las subtareas están completadas
                await this.checkAndUpdateParentProgress(taskId);
            }
            
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error completing task: ${error.message}`);
        }
    }

    // Agregar comentario a tarea
    async addComment(taskId, userId, comentario, tipo = 'comentario', archivo_adjunto = null) {
        try {
            const query = `
                INSERT INTO tarea_comentarios 
                (tarea_id, usuario_id, comentario, tipo, archivo_adjunto)
                VALUES (?, ?, ?, ?, ?)
            `;
            
            const [result] = await this.db.execute(query, [
                taskId, userId, comentario, tipo, archivo_adjunto
            ]);
            
            return result.insertId;
        } catch (error) {
            throw new Error(`Error adding comment: ${error.message}`);
        }
    }

    // Obtener comentarios de una tarea
    async getComments(taskId) {
        try {
            const query = `
                SELECT 
                    tc.*,
                    u.nombres,
                    u.apellidos,
                    u.foto_perfil
                FROM tarea_comentarios tc
                LEFT JOIN usuarios u ON tc.usuario_id = u.id
                WHERE tc.tarea_id = ?
                ORDER BY tc.created_at ASC
            `;
            
            const [rows] = await this.db.execute(query, [taskId]);
            return rows;
        } catch (error) {
            throw new Error(`Error getting comments: ${error.message}`);
        }
    }

    // Agregar entrada al historial
    async addToHistory(taskId, userId, accion, datos = {}) {
        try {
            const query = `
                INSERT INTO tarea_historial 
                (tarea_id, usuario_id, accion, campo_modificado, valor_anterior, valor_nuevo, descripcion)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `;
            
            const [result] = await this.db.execute(query, [
                taskId,
                userId,
                accion,
                datos.campo || null,
                datos.valor_anterior || null,
                datos.valor_nuevo || null,
                datos.descripcion || null
            ]);
            
            return result.insertId;
        } catch (error) {
            throw new Error(`Error adding to history: ${error.message}`);
        }
    }

    // Obtener historial de una tarea
    async getHistory(taskId) {
        try {
            const query = `
                SELECT 
                    th.*,
                    u.nombres,
                    u.apellidos,
                    u.foto_perfil
                FROM tarea_historial th
                LEFT JOIN usuarios u ON th.usuario_id = u.id
                WHERE th.tarea_id = ?
                ORDER BY th.created_at DESC
            `;
            
            const [rows] = await this.db.execute(query, [taskId]);
            return rows;
        } catch (error) {
            throw new Error(`Error getting history: ${error.message}`);
        }
    }



    // Obtener detalles completos de una tarea (para modal)
    async getTaskDetails(taskId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    p.titulo as proyecto_titulo,
                    fp.nombre as fase_nombre,
                    ua.nombres as asignado_nombres,
                    ua.apellidos as asignado_apellidos,
                    ua.foto_perfil as asignado_foto
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN usuarios ua ON e.asignado_a = ua.id
                WHERE e.id = ?
            `;
            
            const [rows] = await this.db.execute(query, [taskId]);
            
            if (rows.length > 0) {
                const task = rows[0];
                
                // Parsear archivos adjuntos si existen
                if (task.archivos_adjuntos) {
                    try {
                        task.archivos_adjuntos = JSON.parse(task.archivos_adjuntos);
                    } catch (e) {
                        task.archivos_adjuntos = [];
                    }
                }
                
                return task;
            }
            
            return null;
        } catch (error) {
            throw new Error(`Error getting task details: ${error.message}`);
        }
    }

    // Obtener tareas de un proyecto con información de workflow
    async getProjectTasksWithWorkflow(projectId) {
        try {
            const query = `
                SELECT 
                    e.*,
                    p.titulo as proyecto_titulo,
                    fp.nombre as fase_nombre,
                    ua.nombres as asignado_nombres,
                    ua.apellidos as asignado_apellidos,
                    ua.foto_perfil as asignado_foto
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN usuarios ua ON e.asignado_a = ua.id
                WHERE e.proyecto_id = ?
                ORDER BY e.created_at DESC
            `;
            
            const [rows] = await this.db.execute(query, [projectId]);
            
            // Agrupar por estado de workflow
            const groupedTasks = {
                todo: [],
                in_progress: [],
                done: []
            };
            
            rows.forEach(task => {
                const workflowStatus = task.estado_workflow || 'todo';
                if (groupedTasks[workflowStatus]) {
                    groupedTasks[workflowStatus].push(task);
                }
            });
            
            return groupedTasks;
        } catch (error) {
            throw new Error(`Error getting project tasks with workflow: ${error.message}`);
        }
    }
}

module.exports = Task;