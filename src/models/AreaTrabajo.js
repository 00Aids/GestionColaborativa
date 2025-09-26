const BaseModel = require('./BaseModel');

class AreaTrabajo extends BaseModel {
    static tableName = 'areas_trabajo';
    
    constructor() {
        super('areas_trabajo');
    }

    /**
     * Genera un código único para el área de trabajo
     * Formato: [4 caracteres]-[3 caracteres] (ej: XZ4F-92A, B7K9-L3M)
     */
    static async generateUniqueCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let attempts = 0;
        const maxAttempts = 100;
        const instance = new this();

        while (attempts < maxAttempts) {
            // Generar primera parte: 4 caracteres
            const parte1 = Array.from({length: 4}, () => 
                chars[Math.floor(Math.random() * chars.length)]
            ).join('');
            
            // Generar segunda parte: 3 caracteres
            const parte2 = Array.from({length: 3}, () => 
                chars[Math.floor(Math.random() * chars.length)]
            ).join('');
            
            const code = `${parte1}-${parte2}`;
            
            // Verificar si el código ya existe
            const existing = await instance.findOne({ codigo: code });
            if (!existing) {
                return code;
            }
            
            attempts++;
        }
        
        throw new Error('No se pudo generar un código único después de múltiples intentos');
    }

    /**
     * Crear nueva área de trabajo
     * Solo requiere código único - se genera automáticamente si no se proporciona
     */
    static async create(data = {}) {
        const instance = new this();
        
        // Generar código único si no se proporciona
        if (!data.codigo) {
            data.codigo = await this.generateUniqueCode();
        }

        // Verificar que el código no exista
        const existingCode = await instance.findOne({ codigo: data.codigo });
        if (existingCode) {
            throw new Error(`El código ${data.codigo} ya está en uso`);
        }

        const areaData = {
            codigo: data.codigo,
            nombre: data.nombre || `Área de Trabajo ${data.codigo}`,
            activo: data.activo !== undefined ? data.activo : true,
            created_at: new Date(),
            updated_at: new Date()
        };

        return await instance.create(areaData);
    }

    /**
     * Actualizar área de trabajo
     */
    static async update(id, data) {
        const instance = new this();
        const updateData = {
            ...data,
            updated_at: new Date()
        };

        // No permitir cambiar el código una vez creado
        delete updateData.codigo;

        // Permitir actualizar nombre si se proporciona
        if (data.nombre !== undefined) {
            updateData.nombre = data.nombre;
        }

        return await instance.update(id, updateData);
    }

    /**
     * Obtener área de trabajo por código
     */
    static async findByCode(codigo) {
        const instance = new this();
        return await instance.findOne({ codigo: codigo });
    }

    /**
     * Obtener todas las áreas activas
     */
    static async findActive() {
        const instance = new this();
        return await instance.findAll({ activo: true });
    }

    /**
     * Obtener todas las áreas
     */
    static async findAll(conditions = {}) {
        const instance = new this();
        return await instance.findAll(conditions);
    }

    /**
     * Obtener área por ID
     */
    static async findById(id) {
        const instance = new this();
        return await instance.findById(id);
    }

    /**
     * Obtener usuarios de un área de trabajo
     */
    static async getUsers(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT u.*, r.nombre as rol_nombre, ua.es_admin, ua.es_propietario, ua.fecha_asignacion
            FROM usuarios u
            INNER JOIN usuario_areas_trabajo ua ON u.id = ua.usuario_id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE ua.area_trabajo_id = ? AND u.activo = 1 AND ua.activo = 1
            ORDER BY ua.es_propietario DESC, ua.es_admin DESC, u.nombres, u.apellidos
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result;
    }

    /**
     * Obtener proyectos de un área de trabajo
     */
    static async getProjects(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) as director_nombre
            FROM proyectos p
            LEFT JOIN usuarios u ON p.director_id = u.id
            WHERE p.area_trabajo_id = ?
            ORDER BY p.created_at DESC
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result;
    }

    /**
     * Obtener estadísticas del área de trabajo
     */
    static async getStats(areaId) {
        const queries = {
            totalUsers: `
                SELECT COUNT(*) as count 
                FROM usuario_areas_trabajo ua 
                INNER JOIN usuarios u ON ua.usuario_id = u.id 
                WHERE ua.area_trabajo_id = ? AND u.activo = 1
            `,
            totalProjects: `
                SELECT COUNT(*) as count 
                FROM proyectos 
                WHERE area_trabajo_id = ?
            `,
            activeProjects: `
                SELECT COUNT(*) as count 
                FROM proyectos 
                WHERE area_trabajo_id = ? AND estado IN ('borrador', 'enviado', 'en_revision', 'aprobado', 'en_desarrollo')
            `,
            completedProjects: `
                SELECT COUNT(*) as count 
                FROM proyectos 
                WHERE area_trabajo_id = ? AND estado = 'finalizado'
            `
        };

        const { pool } = require('../config/database');
        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            const [result] = await pool.execute(query, [areaId]);
            results[key] = result[0]?.count || 0;
        }

        return results;
    }

    /**
     * Verificar si un usuario pertenece a un área
     */
    static async userBelongsToArea(userId, areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT 1 FROM usuario_areas_trabajo 
            WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
        `;
        const [result] = await pool.execute(query, [userId, areaId]);
        return result.length > 0;
    }

    /**
     * Agregar usuario a área de trabajo
     */
    static async addUser(areaId, userId, isAdmin = false, isOwner = false) {
        // Verificar que no exista la relación
        const exists = await this.userBelongsToArea(userId, areaId);
        if (exists) {
            throw new Error('El usuario ya pertenece a esta área de trabajo');
        }

        // Si es propietario, debe ser también admin
        if (isOwner) {
            isAdmin = true;
        }

        const { pool } = require('../config/database');
        const query = `
            INSERT INTO usuario_areas_trabajo (area_trabajo_id, usuario_id, es_admin, es_propietario, activo, created_at)
            VALUES (?, ?, ?, ?, 1, ?)
        `;
        const [result] = await pool.execute(query, [areaId, userId, isAdmin ? 1 : 0, isOwner ? 1 : 0, new Date()]);
        return result;
    }

    /**
     * Remover usuario de área de trabajo
     */
    static async removeUser(areaId, userId) {
        const { pool } = require('../config/database');
        const query = `
            UPDATE usuario_areas_trabajo 
            SET activo = 0, updated_at = ? 
            WHERE area_trabajo_id = ? AND usuario_id = ?
        `;
        const [result] = await pool.execute(query, [new Date(), areaId, userId]);
        return result;
    }

    /**
     * Obtener áreas de trabajo de un usuario
     */
    static async getUserAreas(userId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT a.*, ua.created_at as fecha_asignacion
            FROM areas_trabajo a
            INNER JOIN usuario_areas_trabajo ua ON a.id = ua.area_trabajo_id
            WHERE ua.usuario_id = ? AND a.activo = 1 AND ua.activo = 1
            ORDER BY a.codigo
        `;
        const [result] = await pool.execute(query, [userId]);
        return result;
    }

    /**
     * Obtener el área de trabajo por defecto (A001)
     */
    static async getDefaultArea() {
        const { pool } = require('../config/database');
        const query = `
            SELECT * FROM areas_trabajo 
            WHERE codigo = 'A001' AND activo = 1
            LIMIT 1
        `;
        const [result] = await pool.execute(query);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Crear área de trabajo para un administrador
     * Genera código único automáticamente
     */
    static async createForAdmin() {
        return await this.create();
    }

    // ===== FUNCIONES DEL SISTEMA PROPIETARIO/INVITADO =====

    /**
     * Obtener el propietario de un área específica
     */
    static async getOwner(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT u.*, r.nombre as rol_nombre, ua.fecha_asignacion
            FROM usuarios u
            INNER JOIN usuario_areas_trabajo ua ON u.id = ua.usuario_id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE ua.area_trabajo_id = ? AND ua.es_propietario = 1 AND ua.activo = 1 AND u.activo = 1
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Obtener administradores de un área (incluyendo propietario)
     */
    static async getAdmins(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT u.*, r.nombre as rol_nombre, ua.es_propietario, ua.fecha_asignacion
            FROM usuarios u
            INNER JOIN usuario_areas_trabajo ua ON u.id = ua.usuario_id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE ua.area_trabajo_id = ? AND ua.es_admin = 1 AND ua.activo = 1 AND u.activo = 1
            ORDER BY ua.es_propietario DESC, u.nombres, u.apellidos
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result;
    }

    /**
     * Obtener invitados de un área (usuarios no administradores)
     */
    static async getGuests(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT u.*, r.nombre as rol_nombre, ua.fecha_asignacion
            FROM usuarios u
            INNER JOIN usuario_areas_trabajo ua ON u.id = ua.usuario_id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE ua.area_trabajo_id = ? AND ua.es_admin = 0 AND ua.activo = 1 AND u.activo = 1
            ORDER BY u.nombres, u.apellidos
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result;
    }

    /**
     * Verificar si un área tiene propietario
     */
    static async hasOwner(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT 1 FROM usuario_areas_trabajo 
            WHERE area_trabajo_id = ? AND es_propietario = 1 AND activo = 1
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result.length > 0;
    }

    /**
     * Transferir propiedad de un área
     */
    static async transferOwnership(areaId, currentOwnerId, newOwnerId) {
        const { pool } = require('../config/database');
        
        // Verificar que el usuario actual es propietario
        const currentOwner = await this.getOwner(areaId);
        if (!currentOwner || currentOwner.id !== currentOwnerId) {
            throw new Error('El usuario actual no es propietario de esta área');
        }

        // Verificar que el nuevo propietario tiene acceso al área
        const hasAccess = await this.userBelongsToArea(newOwnerId, areaId);
        if (!hasAccess) {
            throw new Error('El nuevo propietario debe tener acceso al área primero');
        }

        // Iniciar transacción
        await pool.execute('START TRANSACTION');

        try {
            // Remover propiedad del propietario actual
            await pool.execute(`
                UPDATE usuario_areas_trabajo 
                SET es_propietario = 0 
                WHERE area_trabajo_id = ? AND usuario_id = ? AND activo = 1
            `, [areaId, currentOwnerId]);

            // Asignar propiedad al nuevo propietario (y hacerlo admin si no lo es)
            await pool.execute(`
                UPDATE usuario_areas_trabajo 
                SET es_propietario = 1, es_admin = 1 
                WHERE area_trabajo_id = ? AND usuario_id = ? AND activo = 1
            `, [areaId, newOwnerId]);

            await pool.execute('COMMIT');
            return true;
        } catch (error) {
            await pool.execute('ROLLBACK');
            throw new Error(`Error transferring ownership: ${error.message}`);
        }
    }

    /**
     * Obtener estadísticas de usuarios por área
     */
    static async getUserStats(areaId) {
        const { pool } = require('../config/database');
        const query = `
            SELECT 
                COUNT(*) as total_usuarios,
                SUM(CASE WHEN ua.es_propietario = 1 THEN 1 ELSE 0 END) as propietarios,
                SUM(CASE WHEN ua.es_admin = 1 AND ua.es_propietario = 0 THEN 1 ELSE 0 END) as administradores,
                SUM(CASE WHEN ua.es_admin = 0 THEN 1 ELSE 0 END) as invitados
            FROM usuario_areas_trabajo ua
            WHERE ua.area_trabajo_id = ? AND ua.activo = 1
        `;
        const [result] = await pool.execute(query, [areaId]);
        return result[0];
    }
}

module.exports = AreaTrabajo;