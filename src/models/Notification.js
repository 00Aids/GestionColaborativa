const BaseModel = require('./BaseModel');

class Notification extends BaseModel {
    constructor() {
        super('notificaciones');
    }

    // Crear notificación para un usuario específico
    async createForUser(userId, notificationData) {
        try {
            const {
                titulo,
                mensaje,
                tipo = 'info',
                url_accion = null
            } = notificationData;

            const data = {
                usuario_id: userId,
                titulo,
                mensaje,
                tipo,
                url_accion,
                leida: false
            };

            return await this.create(data);
        } catch (error) {
            throw new Error(`Error creating notification: ${error.message}`);
        }
    }

    // Crear notificaciones masivas por rol
    async createForRole(roleId, notificationData) {
        try {
            const query = `
                SELECT u.id as usuario_id
                FROM usuarios u
                WHERE u.rol_id = ? AND u.activo = 1
            `;
            
            const [users] = await this.db.execute(query, [roleId]);
            const notifications = [];

            for (const user of users) {
                const notification = await this.createForUser(user.usuario_id, notificationData);
                notifications.push(notification);
            }

            return notifications;
        } catch (error) {
            throw new Error(`Error creating notifications for role: ${error.message}`);
        }
    }

    // Obtener notificaciones no leídas de un usuario
    async getUnreadForUser(userId) {
        try {
            const query = `
                SELECT * FROM notificaciones 
                WHERE usuario_id = ? AND leida = FALSE 
                ORDER BY created_at DESC
            `;
            
            const [rows] = await this.db.execute(query, [userId]);
            return rows;
        } catch (error) {
            throw new Error(`Error getting unread notifications: ${error.message}`);
        }
    }

    // Marcar notificación como leída
    async markAsRead(notificationId) {
        try {
            const query = `
                UPDATE notificaciones 
                SET leida = TRUE 
                WHERE id = ?
            `;
            
            const [result] = await this.db.execute(query, [notificationId]);
            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Error marking notification as read: ${error.message}`);
        }
    }

    // Marcar todas las notificaciones de un usuario como leídas
    async markAllAsReadForUser(userId) {
        try {
            const query = `
                UPDATE notificaciones 
                SET leida = TRUE 
                WHERE usuario_id = ? AND leida = FALSE
            `;
            
            const [result] = await this.db.execute(query, [userId]);
            return result.affectedRows;
        } catch (error) {
            throw new Error(`Error marking all notifications as read: ${error.message}`);
        }
    }

    // Obtener todas las notificaciones de un usuario
    async findByUser(userId, limit = null) {
        try {
            let query = `
                SELECT * FROM notificaciones 
                WHERE usuario_id = ? 
                ORDER BY created_at DESC
            `;
            
            const params = [userId];
            
            if (limit) {
                query += ' LIMIT ?';
                params.push(limit);
            }
            
            const [rows] = await this.db.execute(query, params);
            return rows;
        } catch (error) {
            throw new Error(`Error getting notifications for user: ${error.message}`);
        }
    }

    // Obtener estadísticas de notificaciones
    async getStatsForUser(userId) {
        try {
            const query = `
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN leida = FALSE THEN 1 ELSE 0 END) as no_leidas,
                    SUM(CASE WHEN leida = TRUE THEN 1 ELSE 0 END) as leidas
                FROM notificaciones 
                WHERE usuario_id = ?
            `;
            
            const [rows] = await this.db.execute(query, [userId]);
            return rows[0] || { total: 0, no_leidas: 0, leidas: 0 };
        } catch (error) {
            throw new Error(`Error getting notification stats: ${error.message}`);
        }
    }
}

module.exports = Notification;