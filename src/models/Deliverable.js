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
}

module.exports = Deliverable;