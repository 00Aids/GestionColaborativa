const BaseModel = require('./BaseModel');

class AreaTrabajo extends BaseModel {
    static tableName = 'areas_trabajo';

    /**
     * Genera un código único para el área de trabajo
     * Formato: [Letra][3 dígitos] (ej: A345, B123, C789)
     */
    static async generateUniqueCode() {
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        let attempts = 0;
        const maxAttempts = 100;

        while (attempts < maxAttempts) {
            // Generar letra aleatoria
            const letter = letters[Math.floor(Math.random() * letters.length)];
            
            // Generar 3 dígitos aleatorios
            const numbers = Math.floor(Math.random() * 900) + 100; // 100-999
            
            const code = `${letter}${numbers}`;
            
            // Verificar si el código ya existe
            const existing = await this.findBy('codigo', code);
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
        // Generar código único si no se proporciona
        if (!data.codigo) {
            data.codigo = await this.generateUniqueCode();
        }

        // Verificar que el código no exista
        const existingCode = await this.findBy('codigo', data.codigo);
        if (existingCode) {
            throw new Error(`El código ${data.codigo} ya está en uso`);
        }

        const areaData = {
            codigo: data.codigo,
            activo: data.activo !== undefined ? data.activo : true,
            created_at: new Date(),
            updated_at: new Date()
        };

        return await super.create(areaData);
    }

    /**
     * Actualizar área de trabajo
     */
    static async update(id, data) {
        const updateData = {
            ...data,
            updated_at: new Date()
        };

        // No permitir cambiar el código una vez creado
        delete updateData.codigo;

        return await super.update(id, updateData);
    }

    /**
     * Obtener área de trabajo por código
     */
    static async findByCode(codigo) {
        return await this.findBy('codigo', codigo);
    }

    /**
     * Obtener todas las áreas activas
     */
    static async findActive() {
        return await this.findAll({ activo: true });
    }

    /**
     * Obtener usuarios de un área de trabajo
     */
    static async getUsers(areaId) {
        const query = `
            SELECT u.*, r.nombre as rol_nombre
            FROM usuarios u
            INNER JOIN usuario_areas_trabajo ua ON u.id = ua.usuario_id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE ua.area_trabajo_id = ? AND u.activo = 1
            ORDER BY u.nombres, u.apellidos
        `;
        return await this.executeQuery(query, [areaId]);
    }

    /**
     * Obtener proyectos de un área de trabajo
     */
    static async getProjects(areaId) {
        const query = `
            SELECT p.*, CONCAT(u.nombres, ' ', u.apellidos) as director_nombre
            FROM proyectos p
            LEFT JOIN usuarios u ON p.director_id = u.id
            WHERE p.area_trabajo_id = ?
            ORDER BY p.created_at DESC
        `;
        return await this.executeQuery(query, [areaId]);
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

        const results = {};
        for (const [key, query] of Object.entries(queries)) {
            const result = await this.executeQuery(query, [areaId]);
            results[key] = result[0]?.count || 0;
        }

        return results;
    }

    /**
     * Verificar si un usuario pertenece a un área
     */
    static async userBelongsToArea(userId, areaId) {
        const query = `
            SELECT 1 FROM usuario_areas_trabajo 
            WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
        `;
        const result = await this.executeQuery(query, [userId, areaId]);
        return result.length > 0;
    }

    /**
     * Agregar usuario a área de trabajo
     */
    static async addUser(areaId, userId) {
        // Verificar que no exista la relación
        const exists = await this.userBelongsToArea(userId, areaId);
        if (exists) {
            throw new Error('El usuario ya pertenece a esta área de trabajo');
        }

        const query = `
            INSERT INTO usuario_areas_trabajo (area_trabajo_id, usuario_id, activo, created_at)
            VALUES (?, ?, 1, ?)
        `;
        return await this.executeQuery(query, [areaId, userId, new Date()]);
    }

    /**
     * Remover usuario de área de trabajo
     */
    static async removeUser(areaId, userId) {
        const query = `
            UPDATE usuario_areas_trabajo 
            SET activo = 0, updated_at = ? 
            WHERE area_trabajo_id = ? AND usuario_id = ?
        `;
        return await this.executeQuery(query, [new Date(), areaId, userId]);
    }

    /**
     * Obtener áreas de trabajo de un usuario
     */
    static async getUserAreas(userId) {
        const query = `
            SELECT a.*, ua.created_at as fecha_asignacion
            FROM areas_trabajo a
            INNER JOIN usuario_areas_trabajo ua ON a.id = ua.area_trabajo_id
            WHERE ua.usuario_id = ? AND a.activo = 1 AND ua.activo = 1
            ORDER BY a.codigo
        `;
        return await this.executeQuery(query, [userId]);
    }

    /**
     * Obtener el área de trabajo por defecto (A001)
     */
    static async getDefaultArea() {
        const query = `
            SELECT * FROM areas_trabajo 
            WHERE codigo = 'A001' AND activo = 1
            LIMIT 1
        `;
        const result = await this.executeQuery(query);
        return result.length > 0 ? result[0] : null;
    }

    /**
     * Crear área de trabajo para un administrador
     * Genera código único automáticamente
     */
    static async createForAdmin() {
        return await this.create();
    }
}

module.exports = AreaTrabajo;