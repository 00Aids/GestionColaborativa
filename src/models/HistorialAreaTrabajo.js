const BaseModel = require('./BaseModel');

class HistorialAreaTrabajo extends BaseModel {
    constructor() {
        super('historial_area_trabajo');
    }

    /**
     * Registrar una actividad en el historial del área de trabajo
     * @param {Object} activityData - Datos de la actividad
     * @param {number} activityData.area_trabajo_id - ID del área de trabajo
     * @param {number} activityData.usuario_id - ID del usuario que realizó la acción
     * @param {string} activityData.accion - Tipo de acción realizada
     * @param {string} activityData.entidad_tipo - Tipo de entidad afectada
     * @param {number} activityData.entidad_id - ID de la entidad afectada
     * @param {string} activityData.descripcion - Descripción de la actividad
     * @param {Object} activityData.datos_anteriores - Datos antes del cambio
     * @param {Object} activityData.datos_nuevos - Datos después del cambio
     * @param {string} activityData.ip_address - Dirección IP del usuario
     * @param {string} activityData.user_agent - User agent del navegador
     */
    async registrarActividad(activityData) {
        try {
            const {
                area_trabajo_id,
                usuario_id,
                accion,
                entidad_tipo,
                entidad_id,
                descripcion,
                datos_anteriores = null,
                datos_nuevos = null,
                ip_address = null,
                user_agent = null
            } = activityData;

            const query = `
                INSERT INTO historial_area_trabajo (
                    area_trabajo_id, usuario_id, accion, entidad_tipo, entidad_id,
                    descripcion, datos_anteriores, datos_nuevos, ip_address, user_agent
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            const params = [
                area_trabajo_id,
                usuario_id,
                accion,
                entidad_tipo,
                entidad_id,
                descripcion,
                datos_anteriores ? JSON.stringify(datos_anteriores) : null,
                datos_nuevos ? JSON.stringify(datos_nuevos) : null,
                ip_address,
                user_agent
            ];

            const [result] = await this.db.execute(query, params);
            return result.insertId;
        } catch (error) {
            console.error('Error registrando actividad en historial:', error);
            throw new Error(`Error registrando actividad: ${error.message}`);
        }
    }

    /**
     * Obtener historial de actividades de un área de trabajo
     * @param {number} areaId - ID del área de trabajo
     * @param {Object} options - Opciones de filtrado
     * @param {number} options.limit - Límite de resultados
     * @param {number} options.offset - Offset para paginación
     * @param {string} options.accion - Filtrar por tipo de acción
     * @param {string} options.entidad_tipo - Filtrar por tipo de entidad
     * @param {Date} options.fecha_desde - Fecha desde
     * @param {Date} options.fecha_hasta - Fecha hasta
     */
    async obtenerHistorial(areaId, options = {}) {
        try {
            const {
                limit = 50,
                offset = 0,
                accion = null,
                entidad_tipo = null,
                fecha_desde = null,
                fecha_hasta = null
            } = options;

            let whereConditions = ['h.area_trabajo_id = ?'];
            let params = [areaId];

            if (accion) {
                whereConditions.push('h.accion = ?');
                params.push(accion);
            }

            if (entidad_tipo) {
                whereConditions.push('h.entidad_tipo = ?');
                params.push(entidad_tipo);
            }

            if (fecha_desde) {
                whereConditions.push('h.created_at >= ?');
                params.push(fecha_desde);
            }

            if (fecha_hasta) {
                whereConditions.push('h.created_at <= ?');
                params.push(fecha_hasta);
            }

            // Validar y sanitizar limit y offset
            const safeLimit = parseInt(limit) || 50;
            const safeOffset = parseInt(offset) || 0;

            const query = `
                SELECT 
                    h.*,
                    CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre,
                    u.email as usuario_email
                FROM historial_area_trabajo h
                LEFT JOIN usuarios u ON h.usuario_id = u.id
                WHERE ${whereConditions.join(' AND ')}
                ORDER BY h.created_at DESC
                LIMIT ${safeLimit} OFFSET ${safeOffset}
            `;

            const [rows] = await this.db.execute(query, params);

            // Parsear JSON fields y manejar posibles errores de JSON
            const result = rows.map(row => {
                try {
                    return {
                        ...row,
                        datos_anteriores: row.datos_anteriores ? JSON.parse(row.datos_anteriores) : null,
                        datos_nuevos: row.datos_nuevos ? JSON.parse(row.datos_nuevos) : null
                    };
                } catch (jsonError) {
                    console.warn('Error parsing JSON for row:', row.id, jsonError);
                    return {
                        ...row,
                        datos_anteriores: null,
                        datos_nuevos: null
                    };
                }
            });

            return {
                data: result,
                total: result.length,
                limit: parseInt(limit),
                offset: parseInt(offset)
            };
        } catch (error) {
            console.error('Error obteniendo historial:', error);
            throw new Error(`Error obteniendo historial: ${error.message}`);
        }
    }

    /**
     * Obtener estadísticas de actividad del área
     * @param {number} areaId - ID del área de trabajo
     * @param {number} dias - Número de días hacia atrás para las estadísticas
     */
    async obtenerEstadisticas(areaId, dias = 30) {
        try {
            const query = `
                SELECT 
                    accion,
                    entidad_tipo,
                    COUNT(*) as total,
                    DATE(created_at) as fecha
                FROM historial_area_trabajo
                WHERE area_trabajo_id = ? 
                AND created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY accion, entidad_tipo, DATE(created_at)
                ORDER BY fecha DESC, total DESC
            `;

            const [rows] = await this.db.execute(query, [areaId, dias]);
            return rows;
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw new Error(`Error obteniendo estadísticas: ${error.message}`);
        }
    }

    /**
     * Obtener actividad reciente del área
     * @param {number} areaId - ID del área de trabajo
     * @param {number} limit - Límite de resultados
     */
    async obtenerActividadReciente(areaId, limit = 10) {
        try {
            const safeLimit = parseInt(limit) || 10;
            const query = `
                SELECT 
                    h.accion,
                    h.entidad_tipo,
                    h.descripcion,
                    h.created_at,
                    CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
                FROM historial_area_trabajo h
                LEFT JOIN usuarios u ON h.usuario_id = u.id
                WHERE h.area_trabajo_id = ?
                ORDER BY h.created_at DESC
                LIMIT ${safeLimit}
            `;

            const [rows] = await this.db.execute(query, [areaId]);
            return rows;
        } catch (error) {
            console.error('Error obteniendo actividad reciente:', error);
            throw new Error(`Error obteniendo actividad reciente: ${error.message}`);
        }
    }

    /**
     * Limpiar historial antiguo (mantener solo los últimos N días)
     * @param {number} dias - Días a mantener
     */
    async limpiarHistorialAntiguo(dias = 365) {
        try {
            const query = `
                DELETE FROM historial_area_trabajo 
                WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)
            `;

            const [result] = await this.db.execute(query, [dias]);
            return result.affectedRows;
        } catch (error) {
            console.error('Error limpiando historial antiguo:', error);
            throw new Error(`Error limpiando historial: ${error.message}`);
        }
    }
}

module.exports = HistorialAreaTrabajo;