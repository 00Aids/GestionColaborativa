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
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.estado = 'activo'
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

  // ==================== GESTIÓN DE WORKFLOW EXPANDIDO ====================

  // Obtener estados válidos para transiciones
  getValidStates() {
    return [
      'pendiente',
      'en_progreso', 
      'entregado',
      'en_revision',
      'aceptado',
      'rechazado',
      'requiere_cambios',
      'completado'
    ];
  }

  // Obtener transiciones válidas desde un estado
  getValidTransitions(currentState) {
    const transitions = {
      'pendiente': ['en_progreso', 'entregado'],
      'en_progreso': ['entregado', 'pendiente'],
      'entregado': ['en_revision', 'en_progreso'],
      'en_revision': ['aceptado', 'rechazado', 'requiere_cambios'],
      'requiere_cambios': ['en_progreso', 'entregado'],
      'aceptado': ['completado'],
      'rechazado': [], // Estado final
      'completado': [] // Estado final
    };
    
    return transitions[currentState] || [];
  }

  // Validar si una transición es válida
  isValidTransition(currentState, newState) {
    const validTransitions = this.getValidTransitions(currentState);
    return validTransitions.includes(newState);
  }

  // Actualizar estado con validación de workflow
  async updateStatusWithWorkflow(deliverableId, newStatus, observaciones = null, userId = null) {
    try {
      // Obtener estado actual
      const deliverable = await this.findById(deliverableId);
      if (!deliverable) {
        throw new Error('Entregable no encontrado');
      }

      // Validar transición
      if (!this.isValidTransition(deliverable.estado, newStatus)) {
        throw new Error(`Transición inválida de '${deliverable.estado}' a '${newStatus}'`);
      }

      // Preparar datos de actualización
      const updateData = {
        estado: newStatus,
        updated_at: new Date()
      };
      
      if (observaciones) {
        updateData.observaciones = observaciones;
      }

      // Acciones específicas por estado
      switch (newStatus) {
        case 'entregado':
          updateData.fecha_entrega_real = new Date();
          break;
        case 'en_revision':
          updateData.fecha_revision = new Date();
          break;
        case 'aceptado':
        case 'completado':
          updateData.fecha_finalizacion = new Date();
          break;
      }

      // Actualizar entregable
      const result = await this.update(deliverableId, updateData);

      // Registrar cambio de estado si se proporciona userId
      if (userId) {
        await this.logStateChange(deliverableId, deliverable.estado, newStatus, userId, observaciones);
      }

      return result;
    } catch (error) {
      throw new Error(`Error updating deliverable status with workflow: ${error.message}`);
    }
  }

  // Registrar cambio de estado en el historial
  async logStateChange(deliverableId, fromState, toState, userId, observaciones = null) {
    try {
      const query = `
        INSERT INTO entregable_historial_estados 
        (entregable_id, estado_anterior, estado_nuevo, usuario_id, observaciones, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
      `;
      
      await this.db.execute(query, [deliverableId, fromState, toState, userId, observaciones]);
    } catch (error) {
      // Si la tabla no existe, crear comentario como alternativa
      await this.addComment(deliverableId, userId, 
        `Estado cambiado de '${fromState}' a '${toState}'. ${observaciones || ''}`, 
        'cambio_estado'
      );
    }
  }

  // Obtener entregables por estado específico con información adicional
  async findByStatusWithDetails(estado) {
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          fp.nombre as fase_nombre,
          at.codigo as area_trabajo_codigo,
          at.codigo as area_trabajo_nombre
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
        WHERE e.estado = ?
        ORDER BY e.fecha_entrega ASC
      `;
      
      const [rows] = await this.db.execute(query, [estado]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding deliverables by status with details: ${error.message}`);
    }
  }

  // Obtener entregables que requieren atención (en revisión, requiere cambios)
  async findRequiringAttention() {
    try {
      return await this.findByStatusWithDetails('en_revision');
    } catch (error) {
      throw new Error(`Error finding deliverables requiring attention: ${error.message}`);
    }
  }

  // Obtener entregables que requieren cambios
  async findRequiringChanges() {
    try {
      return await this.findByStatusWithDetails('requiere_cambios');
    } catch (error) {
      throw new Error(`Error finding deliverables requiring changes: ${error.message}`);
    }
  }

  // Obtener estadísticas expandidas por estado
  async getExpandedStatistics() {
    try {
      const query = `
        SELECT 
          estado,
          COUNT(*) as cantidad,
          COUNT(CASE WHEN fecha_limite < NOW() AND estado NOT IN ('aceptado', 'completado', 'rechazado') THEN 1 END) as vencidos
        FROM entregables 
        GROUP BY estado
        ORDER BY 
          CASE estado
            WHEN 'pendiente' THEN 1
            WHEN 'en_progreso' THEN 2
            WHEN 'entregado' THEN 3
            WHEN 'en_revision' THEN 4
            WHEN 'requiere_cambios' THEN 5
            WHEN 'aceptado' THEN 6
            WHEN 'completado' THEN 7
            WHEN 'rechazado' THEN 8
            ELSE 9
          END
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error getting expanded deliverable statistics: ${error.message}`);
    }
  }

  // Obtener resumen de workflow para un área de trabajo
  async getWorkflowSummary(areaTrabajoId = null) {
    try {
      let query = `
        SELECT 
          e.estado,
          COUNT(*) as cantidad,
          AVG(DATEDIFF(NOW(), e.created_at)) as dias_promedio,
          COUNT(CASE WHEN e.fecha_limite < NOW() AND e.estado NOT IN ('aceptado', 'completado', 'rechazado') THEN 1 END) as vencidos
        FROM entregables e
      `;
      
      const values = [];
      
      if (areaTrabajoId) {
        query += ` WHERE e.area_trabajo_id = ?`;
        values.push(areaTrabajoId);
      }
      
      query += ` GROUP BY e.estado`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error getting workflow summary: ${error.message}`);
    }
  }

  // Obtener entregable por ID con detalles completos
  async findByIdWithDetails(deliverableId) {
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          p.descripcion as proyecto_descripcion,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          director.nombres as director_nombres,
          director.apellidos as director_apellidos,
          director.email as director_email,
          fp.nombre as fase_nombre,
          fp.descripcion as fase_descripcion,
          at.codigo as area_trabajo_codigo,
          at.codigo as area_trabajo_nombre,
          DATEDIFF(e.fecha_limite, NOW()) as dias_restantes,
          (SELECT COUNT(*) FROM entregable_comentarios ec WHERE ec.entregable_id = e.id) as total_comentarios
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios director ON p.director_id = director.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
        WHERE e.id = ?
      `;
      
      const [rows] = await this.db.execute(query, [deliverableId]);
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      throw new Error(`Error finding deliverable by ID with details: ${error.message}`);
    }
  }

  // Obtener entregables por área que requieren revisión del coordinador
  async findByAreaForReview(areaTrabajoId) {
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          fp.nombre as fase_nombre,
          fp.descripcion as fase_descripcion,
          at.codigo as area_trabajo_codigo,
          at.codigo as area_trabajo_nombre,
          DATEDIFF(e.fecha_limite, NOW()) as dias_restantes,
          (SELECT COUNT(*) FROM entregable_comentarios ce WHERE ce.entregable_id = e.id) as total_comentarios
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
        WHERE e.area_trabajo_id = ? 
          AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'rechazado')
        ORDER BY 
          CASE e.estado
            WHEN 'entregado' THEN 1
            WHEN 'en_revision' THEN 2
            WHEN 'requiere_cambios' THEN 3
            WHEN 'rechazado' THEN 4
          END,
          e.fecha_entrega ASC
      `;
      
      const [rows] = await this.db.execute(query, [areaTrabajoId]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding deliverables by area for review: ${error.message}`);
    }
  }
}

module.exports = Deliverable;