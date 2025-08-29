const BaseModel = require('./BaseModel');
const crypto = require('crypto');

class Invitation extends BaseModel {
  constructor() {
    super('invitaciones');
  }

  // Crear invitación con código único
  async create(invitationData) {
    try {
      // Validar campos requeridos
      if (!invitationData.proyecto_id) {
        throw new Error('proyecto_id es requerido');
      }
      if (!invitationData.invitado_por) {
        throw new Error('invitado_por es requerido');
      }
  
      // Generar código único de invitación
      invitationData.codigo_invitacion = this.generateInvitationCode();
      
      // Establecer fecha de expiración (7 días por defecto si no se especifica)
      if (!invitationData.fecha_expiracion) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 7);
        invitationData.fecha_expiracion = expirationDate;
      }
      
      // Agregar timestamps
      invitationData.created_at = new Date();
      invitationData.updated_at = new Date();
      invitationData.estado = 'pendiente';
      
      return await super.create(invitationData);
    } catch (error) {
      throw new Error(`Error creating invitation: ${error.message}`);
    }
  }

  // Generar código único de invitación
  generateInvitationCode() {
    return crypto.randomBytes(16).toString('hex').toUpperCase();
  }

  // Buscar invitación por código
  async findByCode(codigo_invitacion) {
    try {
      const query = `
        SELECT i.*, p.nombre as proyecto_nombre, u.nombre as invitado_por
        FROM ${this.tableName} i
        LEFT JOIN proyectos p ON i.proyecto_id = p.id
        LEFT JOIN usuarios u ON i.invitado_por = u.id
        WHERE i.codigo_invitacion = ? AND i.estado = 'pendiente'
      `;
      const [rows] = await this.db.execute(query, [codigo_invitacion]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding invitation by code: ${error.message}`);
    }
  }

  // Obtener invitaciones de un proyecto
  async findByProject(proyecto_id) {
    try {
      const query = `
        SELECT i.*, u.nombre as invitado_nombre, u.email as invitado_email,
               ub.nombre as invitado_por_nombre
        FROM ${this.tableName} i
        LEFT JOIN usuarios u ON i.usuario_id = u.id
        LEFT JOIN usuarios ub ON i.invitado_por = ub.id
        WHERE i.proyecto_id = ?
        ORDER BY i.created_at DESC
      `;
      const [rows] = await this.db.execute(query, [proyecto_id]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding invitations by project: ${error.message}`);
    }
  }

  // Aceptar invitación
  async accept(invitationId, userId) {
    try {
      const invitation = await this.findById(invitationId);
      if (!invitation) {
        throw new Error('Invitación no encontrada');
      }

      if (invitation.fecha_expiracion < new Date()) {
        throw new Error('La invitación ha expirado');
      }

      if (invitation.estado !== 'pendiente') {
        throw new Error('La invitación ya ha sido procesada');
      }

      // Actualizar estado de la invitación
      await this.update(invitationId, {
        estado: 'aceptada',
        fecha_aceptacion: new Date(),
        updated_at: new Date()
      });

      // Agregar usuario al proyecto (esto se manejará en el controlador)
      return invitation;
    } catch (error) {
      throw new Error(`Error accepting invitation: ${error.message}`);
    }
  }

  // Rechazar invitación
  async reject(invitationId) {
    try {
      return await this.update(invitationId, {
        estado: 'rechazada',
        fecha_rechazo: new Date(),
        updated_at: new Date()
      });
    } catch (error) {
      throw new Error(`Error rejecting invitation: ${error.message}`);
    }
  }

  // Verificar si el usuario ya tiene una invitación pendiente para el proyecto
  async hasActiveinvitation(proyecto_id, usuario_id) {
    try {
      const conditions = {
        proyecto_id,
        usuario_id,
        estado: 'pendiente'
      };
      const invitation = await this.findOne(conditions);
      return invitation !== null;
    } catch (error) {
      throw new Error(`Error checking active invitation: ${error.message}`);
    }
  }

  // Limpiar invitaciones expiradas
  async cleanExpired() {
    try {
      const query = `
        UPDATE ${this.tableName} 
        SET estado = 'expirada', updated_at = NOW()
        WHERE fecha_expiracion < NOW() AND estado = 'pendiente'
      `;
      const [result] = await this.db.execute(query);
      return result.affectedRows;
    } catch (error) {
      throw new Error(`Error cleaning expired invitations: ${error.message}`);
    }
  }

  // Obtener estadísticas de invitaciones
  async getStats(proyecto_id) {
    try {
      const query = `
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
          SUM(CASE WHEN estado = 'aceptada' THEN 1 ELSE 0 END) as aceptadas,
          SUM(CASE WHEN estado = 'rechazada' THEN 1 ELSE 0 END) as rechazadas,
          SUM(CASE WHEN estado = 'expirada' THEN 1 ELSE 0 END) as expiradas
        FROM ${this.tableName}
        WHERE proyecto_id = ?
      `;
      const [rows] = await this.db.execute(query, [proyecto_id]);
      return rows[0];
    } catch (error) {
      throw new Error(`Error getting invitation stats: ${error.message}`);
    }
  }
}

module.exports = Invitation;