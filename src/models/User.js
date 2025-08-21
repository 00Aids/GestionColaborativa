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
}

module.exports = User;