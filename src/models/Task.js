const BaseModel = require('./BaseModel');

class Task extends BaseModel {
    constructor() {
        super('entregables'); // Usamos la tabla entregables como base para tareas
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
                    CASE 
                        WHEN e.fecha_limite < NOW() AND e.estado != 'completado' THEN 'high'
                        WHEN e.fecha_limite < DATE_ADD(NOW(), INTERVAL 3 DAY) THEN 'medium'
                        ELSE 'low'
                    END as prioridad
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
                tipo_enfoque = 'feature'
            } = taskData;

            const query = `
                INSERT INTO entregables (
                    proyecto_id, fase_id, titulo, descripcion, 
                    fecha_limite, estado, observaciones
                ) VALUES (?, ?, ?, ?, ?, 'pendiente', ?)
            `;
            
            const [result] = await this.db.execute(query, [
                proyecto_id, fase_id, titulo, descripcion, 
                fecha_limite, JSON.stringify({tipo_enfoque})
            ]);
            
            return result.insertId;
        } catch (error) {
            throw new Error(`Error creating task: ${error.message}`);
        }
    }

    // Actualizar estado de tarea
    async updateStatus(taskId, newStatus) {
        try {
            const query = `
                UPDATE entregables 
                SET estado = ?, updated_at = NOW() 
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [newStatus, taskId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error updating task status: ${error.message}`);
        }
    }
}

module.exports = Task;