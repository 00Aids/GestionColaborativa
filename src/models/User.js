const BaseModel = require('./BaseModel');
const bcrypt = require('bcryptjs');

class User extends BaseModel {
  constructor() {
    super('usuarios');
  }

  // Crear usuario con hash de contraseña
  async create(userData) {
    try {
      // Hash de la contraseña
      if (userData.password) {
        userData.password_hash = await bcrypt.hash(userData.password, 10);
        delete userData.password;
      }
      
      // Agregar timestamp
      userData.created_at = new Date();
      userData.updated_at = new Date();
      
      return await super.create(userData);
    } catch (error) {
      throw new Error(`Error creating user: ${error.message}`);
    }
  }

  // Buscar usuario por email
  async findByEmail(email) {
    try {
      return await this.findOne({ email, activo: true });
    } catch (error) {
      throw new Error(`Error finding user by email: ${error.message}`);
    }
  }

  // Buscar usuario por código
  async findByCode(codigo_usuario) {
    try {
      return await this.findOne({ codigo_usuario, activo: true });
    } catch (error) {
      throw new Error(`Error finding user by code: ${error.message}`);
    }
  }

  // Verificar contraseña
  async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw new Error(`Error verifying password: ${error.message}`);
    }
  }

  // Autenticar usuario
  async authenticate(email, password) {
    try {
      console.log('🔍 Intentando autenticar:', email);
      const user = await this.findByEmail(email);
      
      if (!user) {
        console.log('❌ Usuario no encontrado');
        return null;
      }
      
      console.log('✅ Usuario encontrado:', user.email);
      console.log('🔑 Hash en BD:', user.password_hash);
      console.log('🔑 Password ingresada:', password);
      
      const isValidPassword = await this.verifyPassword(password, user.password_hash);
      console.log('🔐 Password válida:', isValidPassword);
      
      if (!isValidPassword) {
        return null;
      }
      
      // Actualizar último acceso
      await this.update(user.id, { ultimo_acceso: new Date() });
      
      // Remover password_hash del objeto retornado
      delete user.password_hash;
      
      return user;
    } catch (error) {
      console.error('💥 Error en authenticate:', error);
      throw new Error(`Error authenticating user: ${error.message}`);
    }
  }

  // Obtener usuarios con rol
  async findWithRole(conditions = {}) {
    try {
      let query = `
        SELECT u.*, r.nombre as rol_nombre, r.descripcion as rol_descripcion
        FROM usuarios u
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE 1=1
      `;
      
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereConditions = Object.keys(conditions)
          .map(key => `u.${key} = ?`)
          .join(' AND ');
        query += ` AND ${whereConditions}`;
        values.push(...Object.values(conditions));
      }
      
      query += ` ORDER BY u.created_at DESC`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error finding users with role: ${error.message}`);
    }
  }

  // Cambiar contraseña
  async changePassword(userId, newPassword) {
    try {
      const password_hash = await bcrypt.hash(newPassword, 10);
      return await this.update(userId, { 
        password_hash,
        updated_at: new Date()
      });
    } catch (error) {
      throw new Error(`Error changing password: ${error.message}`);
    }
  }

  // Desactivar usuario
  async deactivate(userId) {
    try {
      return await this.update(userId, { 
        activo: false,
        updated_at: new Date()
      });
    } catch (error) {
      throw new Error(`Error deactivating user: ${error.message}`);
    }
  }

  // Obtener usuarios por rol
  async findByRole(roleName) {
    try {
      const query = `
        SELECT u.*, r.nombre as rol_nombre
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE r.nombre = ? AND u.activo = true
        ORDER BY u.nombres, u.apellidos
      `;
      
      const [rows] = await this.db.execute(query, [roleName]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding users by role: ${error.message}`);
    }
  }

  // ===== FUNCIONES DE ÁREAS DE TRABAJO =====

  // Obtener áreas de trabajo de un usuario
  async getUserAreas(userId) {
    try {
      const query = `
        SELECT a.*, uat.created_at as fecha_asignacion, uat.es_admin, a.id as area_trabajo_id
        FROM areas_trabajo a
        INNER JOIN usuario_areas_trabajo uat ON a.id = uat.area_trabajo_id
        WHERE uat.usuario_id = ? AND uat.activo = 1 AND a.activo = 1
        ORDER BY a.codigo
      `;
      
      const [rows] = await this.db.execute(query, [userId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting user areas: ${error.message}`);
    }
  }

  // Verificar si un usuario pertenece a un área específica
  async belongsToArea(userId, areaId) {
    try {
      const query = `
        SELECT 1 FROM usuario_areas_trabajo 
        WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
      `;
      
      const [rows] = await this.db.execute(query, [userId, areaId]);
      return rows.length > 0;
    } catch (error) {
      throw new Error(`Error checking user area membership: ${error.message}`);
    }
  }

  // Asignar usuario a área de trabajo
  async assignToArea(userId, areaId, isAdmin = false) {
    try {
      // Verificar que no exista la relación
      const exists = await this.belongsToArea(userId, areaId);
      if (exists) {
        throw new Error('El usuario ya pertenece a esta área de trabajo');
      }

      const query = `
        INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, activo, created_at)
        VALUES (?, ?, ?, 1, ?)
      `;
      
      const [result] = await this.db.execute(query, [userId, areaId, isAdmin ? 1 : 0, new Date()]);
      return result;
    } catch (error) {
      throw new Error(`Error assigning user to area: ${error.message}`);
    }
  }

  // Remover usuario de área de trabajo
  async removeFromArea(userId, areaId) {
    try {
      const query = `UPDATE usuario_areas_trabajo SET activo = 0 WHERE usuario_id = ? AND area_trabajo_id = ?`;
      const [result] = await this.db.execute(query, [userId, areaId]);
      return result;
    } catch (error) {
      throw new Error(`Error removing user from area: ${error.message}`);
    }
  }

  // Obtener usuarios de un área específica
  async findByArea(areaId) {
    try {
      const query = `
        SELECT u.*, r.nombre as rol_nombre, uat.created_at as fecha_asignacion, uat.es_admin
        FROM usuarios u
        INNER JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE uat.area_trabajo_id = ? AND u.activo = 1 AND uat.activo = 1
        ORDER BY u.nombres, u.apellidos
      `;
      
      const [rows] = await this.db.execute(query, [areaId]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding users by area: ${error.message}`);
    }
  }

  // Obtener el área principal de un usuario (la primera asignada)
  async getPrimaryArea(userId) {
    try {
      const areas = await this.getUserAreas(userId);
      return areas.length > 0 ? areas[0] : null;
    } catch (error) {
      throw new Error(`Error getting primary area: ${error.message}`);
    }
  }

  // Verificar si un usuario es admin de algún área
  async isAreaAdmin(userId, areaTrabajoId = null) {
    try {
      const user = await this.findById(userId);
      if (!user) return false;
      
      // Verificar si el rol es Administrador General
      const roleQuery = `
        SELECT r.nombre FROM roles r 
        WHERE r.id = ? AND r.nombre LIKE '%Administrador%'
      `;
      
      const [roleRows] = await this.db.execute(roleQuery, [user.rol_id]);
      const isGeneralAdmin = roleRows.length > 0;
      
      // Si es administrador general, verificar que tenga área asignada
      if (isGeneralAdmin) {
        if (areaTrabajoId) {
          // Verificar si tiene acceso a esta área específica
          const areaQuery = `
            SELECT 1 FROM usuario_areas_trabajo 
            WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
          `;
          const [areaRows] = await this.db.execute(areaQuery, [userId, areaTrabajoId]);
          return areaRows.length > 0;
        } else {
          // Verificar si tiene algún área asignada
          const anyAreaQuery = `
            SELECT 1 FROM usuario_areas_trabajo 
            WHERE usuario_id = ? AND activo = 1
          `;
          const [anyAreaRows] = await this.db.execute(anyAreaQuery, [userId]);
          return anyAreaRows.length > 0;
        }
      }
      
      // Verificar si es admin específico del área
      if (areaTrabajoId) {
        const adminQuery = `
          SELECT 1 FROM usuario_areas_trabajo 
          WHERE usuario_id = ? AND area_trabajo_id = ? AND es_admin = 1 AND activo = 1
        `;
        const [adminRows] = await this.db.execute(adminQuery, [userId, areaTrabajoId]);
        return adminRows.length > 0;
      }
      
      return false;
    } catch (error) {
      throw new Error(`Error checking if user is area admin: ${error.message}`);
    }
  }

  // Verificar si un usuario tiene acceso a un área específica
  async hasAreaAccess(userId, areaTrabajoId) {
    try {
      const query = `
        SELECT 1 FROM usuario_areas_trabajo 
        WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
      `;
      
      const [rows] = await this.db.execute(query, [userId, areaTrabajoId]);
      return rows.length > 0;
    } catch (error) {
      throw new Error(`Error checking area access: ${error.message}`);
    }
  }


}

module.exports = User;