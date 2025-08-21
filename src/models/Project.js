const BaseModel = require('./BaseModel');

class Project extends BaseModel {
  constructor() {
    super('proyectos');
  }

  // Crear proyecto
  async create(projectData) {
    try {
      projectData.created_at = new Date();
      projectData.updated_at = new Date();
      
      return await super.create(projectData);
    } catch (error) {
      throw new Error(`Error creating project: ${error.message}`);
    }
  }

  // Obtener proyectos con información relacionada
  async findWithDetails(conditions = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        WHERE 1=1
      `;
      
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereConditions = Object.keys(conditions)
          .map(key => `p.${key} = ?`)
          .join(' AND ');
        query += ` AND ${whereConditions}`;
        values.push(...Object.values(conditions));
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error finding projects with details: ${error.message}`);
    }
  }

  // Obtener proyectos por estudiante
  async findByStudent(studentId) {
    try {
      return await this.findWithDetails({ estudiante_id: studentId });
    } catch (error) {
      throw new Error(`Error finding projects by student: ${error.message}`);
    }
  }

  // Obtener proyectos por director
  async findByDirector(directorId) {
    try {
      return await this.findWithDetails({ director_id: directorId });
    } catch (error) {
      throw new Error(`Error finding projects by director: ${error.message}`);
    }
  }

  // Obtener proyectos por estado
  async findByStatus(estado) {
    try {
      return await this.findWithDetails({ estado });
    } catch (error) {
      throw new Error(`Error finding projects by status: ${error.message}`);
    }
  }

  // Actualizar estado del proyecto
  async updateStatus(projectId, newStatus, observaciones = null) {
    try {
      const updateData = {
        estado: newStatus,
        updated_at: new Date()
      };
      
      if (observaciones) {
        updateData.observaciones = observaciones;
      }
      
      return await this.update(projectId, updateData);
    } catch (error) {
      throw new Error(`Error updating project status: ${error.message}`);
    }
  }

  // Obtener estadísticas de proyectos
  async getStatistics() {
    try {
      const query = `
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM proyectos 
        GROUP BY estado
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project statistics: ${error.message}`);
    }
  }

  // Buscar proyectos por término
  async search(searchTerm) {
    try {
      const query = `
        SELECT 
          p.*,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        WHERE 
          p.titulo LIKE ? OR 
          p.descripcion LIKE ? OR
          CONCAT(u.nombres, ' ', u.apellidos) LIKE ?
        ORDER BY p.created_at DESC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const [rows] = await this.db.execute(query, [searchPattern, searchPattern, searchPattern]);
      return rows;
    } catch (error) {
      throw new Error(`Error searching projects: ${error.message}`);
    }
  }
}

module.exports = Project;