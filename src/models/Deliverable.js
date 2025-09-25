const BaseModel = require('./BaseModel');

class Deliverable extends BaseModel {
  constructor() {
    super('entregables');
  }

  // Crear entregable
  async create(deliverableData) {
    try {
      deliverableData.created_at = new Date();
      deliverableData.updated_at = new Date();
      
      // Si no se especifica area_trabajo_id, obtenerlo del proyecto
      if (!deliverableData.area_trabajo_id && deliverableData.proyecto_id) {
        const Project = require('./Project');
        const projectModel = new Project();
        const project = await projectModel.findById(deliverableData.proyecto_id);
        if (project && project.area_trabajo_id) {
          deliverableData.area_trabajo_id = project.area_trabajo_id;
        }
      }
      
      return await super.create(deliverableData);
    } catch (error) {
      throw new Error(`Error creating deliverable: ${error.message}`);
    }
  }

  // Obtener entregables con información del proyecto
  async findWithProject(conditions = {}) {
    try {
      let query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          fp.nombre as fase_nombre,
          fp.descripcion as fase_descripcion,
          at.codigo as area_trabajo_codigo
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
        WHERE 1=1
      `;
      
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereConditions = Object.keys(conditions)
          .map(key => {
            if (key === 'area_trabajo_id') {
              return `e.area_trabajo_id = ?`;
            }
            return `e.${key} = ?`;
          })
          .join(' AND ');
        query += ` AND ${whereConditions}`;
        values.push(...Object.values(conditions));
      }
      
      query += ` ORDER BY e.fecha_entrega ASC`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error finding deliverables with project: ${error.message}`);
    }
  }

  // Obtener entregables por proyecto
  async findByProject(projectId) {
    try {
      return await this.findWithProject({ proyecto_id: projectId });
    } catch (error) {
      throw new Error(`Error finding deliverables by project: ${error.message}`);
    }
  }

  // Obtener entregables por estado
  async findByStatus(estado) {
    try {
      return await this.findWithProject({ estado });
    } catch (error) {
      throw new Error(`Error finding deliverables by status: ${error.message}`);
    }
  }

  // Obtener entregables por estudiante
  async findByStudent(studentId) {
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          fp.nombre as fase_nombre,
          fp.descripcion as fase_descripcion,
          at.codigo as area_trabajo_codigo
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
        INNER JOIN project_members pm ON p.id = pm.proyecto_id
        WHERE pm.usuario_id = ? AND pm.activo = 1
        ORDER BY e.fecha_entrega ASC
      `;
      
      const [rows] = await this.db.execute(query, [studentId]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding deliverables by student: ${error.message}`);
    }
  }

  // Obtener entregables pendientes
  async findPending() {
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        WHERE e.estado = 'pendiente' AND e.fecha_entrega >= CURDATE()
        ORDER BY e.fecha_entrega ASC
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error finding pending deliverables: ${error.message}`);
    }
  }

  // Obtener entregables vencidos
  async findOverdue() {
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          fp.nombre as fase_nombre,
          fp.descripcion as fase_descripcion
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        WHERE e.estado = 'pendiente' AND e.fecha_entrega < CURDATE()
        ORDER BY e.fecha_entrega ASC
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error finding overdue deliverables: ${error.message}`);
    }
  }

  // Actualizar estado del entregable
  async updateStatus(deliverableId, newStatus, observaciones = null) {
    try {
      const updateData = {
        estado: newStatus,
        updated_at: new Date()
      };
      
      if (observaciones) {
        updateData.observaciones = observaciones;
      }
      
      if (newStatus === 'entregado') {
        updateData.fecha_entrega_real = new Date();
      }
      
      return await this.update(deliverableId, updateData);
    } catch (error) {
      throw new Error(`Error updating deliverable status: ${error.message}`);
    }
  }

  // Obtener estadísticas de entregables
  async getStatistics() {
    try {
      const query = `
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM entregables 
        GROUP BY estado
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error getting deliverable statistics: ${error.message}`);
    }
  }

  // ==================== GESTIÓN DE COMENTARIOS ====================

  // Agregar comentario a un entregable
  async addComment(deliverableId, userId, comentario, tipo = 'comentario', archivo_adjunto = null) {
    try {
      const query = `
        INSERT INTO entregable_comentarios 
        (entregable_id, usuario_id, comentario, tipo, archivo_adjunto, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const [result] = await this.db.execute(query, [
        deliverableId, 
        userId, 
        comentario, 
        tipo, 
        archivo_adjunto
      ]);
      
      return result.insertId;
    } catch (error) {
      throw new Error(`Error adding deliverable comment: ${error.message}`);
    }
  }

  // Obtener comentarios de un entregable
  async getComments(deliverableId) {
    try {
      const query = `
        SELECT 
          ec.*,
          u.nombres,
          u.apellidos,
          u.email,
          r.nombre as rol_nombre
        FROM entregable_comentarios ec
        LEFT JOIN usuarios u ON ec.usuario_id = u.id
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE ec.entregable_id = ?
        ORDER BY ec.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [deliverableId]);
      
      // Procesar archivos adjuntos
      return rows.map(comment => ({
        ...comment,
        archivo_adjunto: comment.archivo_adjunto ? JSON.parse(comment.archivo_adjunto) : null
      }));
    } catch (error) {
      throw new Error(`Error getting deliverable comments: ${error.message}`);
    }
  }

  // Actualizar comentario de entregable
  async updateComment(commentId, comentario, userId) {
    try {
      const query = `
        UPDATE entregable_comentarios 
        SET comentario = ?, updated_at = NOW()
        WHERE id = ? AND usuario_id = ?
      `;
      
      const [result] = await this.db.execute(query, [comentario, commentId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating deliverable comment: ${error.message}`);
    }
  }

  // Eliminar comentario de entregable
  async deleteComment(commentId, userId) {
    try {
      const query = `
        DELETE FROM entregable_comentarios 
        WHERE id = ? AND usuario_id = ?
      `;
      
      const [result] = await this.db.execute(query, [commentId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting deliverable comment: ${error.message}`);
    }
  }

  // Contar comentarios de un entregable
  async countComments(deliverableId) {
    try {
      const query = `
        SELECT COUNT(*) as total 
        FROM entregable_comentarios 
        WHERE entregable_id = ?
      `;
      
      const [rows] = await this.db.execute(query, [deliverableId]);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting deliverable comments: ${error.message}`);
    }
  }
}

module.exports = Deliverable;