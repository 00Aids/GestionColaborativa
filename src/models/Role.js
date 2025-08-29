const BaseModel = require('./BaseModel');

class Role extends BaseModel {
  constructor() {
    super('roles');
  }

  // Obtener rol con sus permisos parseados
  async findById(id) {
    try {
      const role = await super.findById(id);
      if (role && role.permisos) {
        // Verificar si permisos ya es un objeto o necesita parsing
        if (typeof role.permisos === 'string') {
          role.permisos = JSON.parse(role.permisos);
        }
        // Si ya es un objeto, no hacer nada
      }
      return role;
    } catch (error) {
      throw new Error(`Error finding role: ${error.message}`);
    }
  }

  // Obtener rol por nombre
  async findByName(nombre) {
    try {
      const role = await this.findOne({ nombre, activo: true });
      if (role && role.permisos) {
        // Verificar si permisos ya es un objeto o necesita parsing
        if (typeof role.permisos === 'string') {
          role.permisos = JSON.parse(role.permisos);
        }
      }
      return role;
    } catch (error) {
      throw new Error(`Error finding role by name: ${error.message}`);
    }
  }

  // Crear rol con permisos
  async create(roleData) {
    try {
      if (roleData.permisos && typeof roleData.permisos === 'object') {
        roleData.permisos = JSON.stringify(roleData.permisos);
      }
      
      roleData.created_at = new Date();
      roleData.updated_at = new Date();
      
      return await super.create(roleData);
    } catch (error) {
      throw new Error(`Error creating role: ${error.message}`);
    }
  }

  // Actualizar rol
  async update(id, roleData) {
    try {
      if (roleData.permisos && typeof roleData.permisos === 'object') {
        roleData.permisos = JSON.stringify(roleData.permisos);
      }
      
      roleData.updated_at = new Date();
      
      return await super.update(id, roleData);
    } catch (error) {
      throw new Error(`Error updating role: ${error.message}`);
    }
  }

  // Verificar si un rol tiene un permiso específico
  async hasPermission(roleId, permission) {
    try {
      const role = await this.findById(roleId);
      if (!role || !role.permisos) {
        return false;
      }
      
      return role.permisos.includes(permission);
    } catch (error) {
      throw new Error(`Error checking permission: ${error.message}`);
    }
  }

  // Obtener todos los roles activos
  async findActive() {
    try {
      const roles = await this.findAll({ activo: true });
      return roles.map(role => {
        if (role.permisos && typeof role.permisos === 'string') {
          try {
            role.permisos = JSON.parse(role.permisos);
          } catch (parseError) {
            console.warn('Error parsing permissions for role:', role.id, parseError);
            role.permisos = {};
          }
        }
        return role;
      });
    } catch (error) {
      throw new Error(`Error finding active roles: ${error.message}`);
    }
  }
}

module.exports = Role;