const BaseModel = require('./BaseModel');

class Evaluation extends BaseModel {
  constructor() {
    super('evaluaciones');
  }

  // Crear evaluación
  async create(evaluationData) {
    try {
      evaluationData.created_at = new Date();
      evaluationData.updated_at = new Date();
      
      return await super.create(evaluationData);
    } catch (error) {
      throw new Error(`Error creating evaluation: ${error.message}`);
    }
  }

  // Obtener evaluaciones con información completa
  async findWithDetails(conditions = {}) {
    try {
      let query = `
        SELECT 
          ev.*,
          p.titulo as proyecto_titulo,
          est.nombres as estudiante_nombres,
          est.apellidos as estudiante_apellidos,
          eval.nombres as evaluador_nombres,
          eval.apellidos as evaluador_apellidos,
          ent.titulo as entregable_titulo,
          rub.nombre as rubrica_nombre,
          rub.criterios as rubrica_criterios
        FROM evaluaciones ev
        LEFT JOIN proyectos p ON ev.proyecto_id = p.id
        LEFT JOIN usuarios est ON p.estudiante_id = est.id
        LEFT JOIN usuarios eval ON ev.evaluador_id = eval.id
        LEFT JOIN entregables ent ON ev.entregable_id = ent.id
        LEFT JOIN rubricas_evaluacion rub ON ev.rubrica_id = rub.id
        WHERE 1=1
      `;
      
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        const whereConditions = Object.keys(conditions)
          .map(key => `ev.${key} = ?`)
          .join(' AND ');
        query += ` AND ${whereConditions}`;
        values.push(...Object.values(conditions));
      }
      
      query += ` ORDER BY ev.created_at DESC`;
      
      const [rows] = await this.db.execute(query, values);
      
      // Parsear criterios de rúbrica y calificaciones
      return rows.map(row => {
        if (row.rubrica_criterios) {
          row.rubrica_criterios = JSON.parse(row.rubrica_criterios);
        }
        if (row.calificaciones) {
          row.calificaciones = JSON.parse(row.calificaciones);
        }
        return row;
      });
    } catch (error) {
      throw new Error(`Error finding evaluations with details: ${error.message}`);
    }
  }

  // Obtener evaluaciones por proyecto
  async findByProject(projectId) {
    try {
      return await this.findWithDetails({ proyecto_id: projectId });
    } catch (error) {
      throw new Error(`Error finding evaluations by project: ${error.message}`);
    }
  }

  // Obtener evaluaciones por evaluador
  async findByEvaluator(evaluatorId) {
    try {
      return await this.findWithDetails({ evaluador_id: evaluatorId });
    } catch (error) {
      throw new Error(`Error finding evaluations by evaluator: ${error.message}`);
    }
  }

  // Obtener evaluaciones por estudiante
  async findByStudent(studentId) {
    try {
      const query = `
        SELECT 
          ev.*,
          p.titulo as proyecto_titulo,
          eval.nombres as evaluador_nombres,
          eval.apellidos as evaluador_apellidos,
          ent.titulo as entregable_titulo,
          rub.nombre as rubrica_nombre
        FROM evaluaciones ev
        LEFT JOIN proyectos p ON ev.proyecto_id = p.id
        LEFT JOIN usuarios eval ON ev.evaluador_id = eval.id
        LEFT JOIN entregables ent ON ev.entregable_id = ent.id
        LEFT JOIN rubricas_evaluacion rub ON ev.rubrica_id = rub.id
        WHERE p.estudiante_id = ?
        ORDER BY ev.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [studentId]);
      
      // Parsear calificaciones si existen
      return rows.map(row => {
        if (row.calificaciones) {
          try {
            row.calificaciones = JSON.parse(row.calificaciones);
          } catch (e) {
            row.calificaciones = null;
          }
        }
        return row;
      });
    } catch (error) {
      throw new Error(`Error finding evaluations by student: ${error.message}`);
    }
  }

  // Obtener evaluaciones pendientes
  async findPending() {
    try {
      return await this.findWithDetails({ estado: 'pendiente' });
    } catch (error) {
      throw new Error(`Error finding pending evaluations: ${error.message}`);
    }
  }

  // Obtener evaluaciones por área de trabajo
  async findByArea(areaId) {
    try {
      const query = `
        SELECT 
          ev.*,
          p.titulo as proyecto_titulo,
          est.nombres as estudiante_nombres,
          est.apellidos as estudiante_apellidos,
          eval.nombres as evaluador_nombres,
          eval.apellidos as evaluador_apellidos,
          ent.titulo as entregable_titulo,
          rub.nombre as rubrica_nombre,
          rub.criterios as rubrica_criterios
        FROM evaluaciones ev
        LEFT JOIN proyectos p ON ev.proyecto_id = p.id
        LEFT JOIN usuarios est ON p.estudiante_id = est.id
        LEFT JOIN usuarios eval ON ev.evaluador_id = eval.id
        LEFT JOIN entregables ent ON ev.entregable_id = ent.id
        LEFT JOIN rubricas_evaluacion rub ON ev.rubrica_id = rub.id
        WHERE p.area_trabajo_id = ?
        ORDER BY ev.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [areaId]);
      
      // Parsear criterios de rúbrica y calificaciones
      return rows.map(row => {
        if (row.rubrica_criterios) {
          try {
            row.rubrica_criterios = JSON.parse(row.rubrica_criterios);
          } catch (e) {
            row.rubrica_criterios = null;
          }
        }
        if (row.calificaciones) {
          try {
            row.calificaciones = JSON.parse(row.calificaciones);
          } catch (e) {
            row.calificaciones = null;
          }
        }
        return row;
      });
    } catch (error) {
      throw new Error(`Error finding evaluations by area: ${error.message}`);
    }
  }

  // Actualizar evaluación con calificaciones
  async updateWithGrades(evaluationId, calificaciones, observaciones, notaFinal) {
    try {
      const updateData = {
        calificaciones: JSON.stringify(calificaciones),
        observaciones,
        nota_final: notaFinal,
        estado: 'completada',
        fecha_evaluacion: new Date(),
        updated_at: new Date()
      };
      
      return await this.update(evaluationId, updateData);
    } catch (error) {
      throw new Error(`Error updating evaluation with grades: ${error.message}`);
    }
  }

  // Calcular promedio de calificaciones de un proyecto
  // Línea 123 - Método calculateProjectAverage
  async calculateProjectAverage(projectId) {
    try {
      const query = `
        SELECT AVG(puntaje_total) as promedio
        FROM evaluaciones 
        WHERE proyecto_id = ? AND estado = 'finalizada'
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      return rows[0]?.promedio || 0;
    } catch (error) {
      throw new Error(`Error calculating project average: ${error.message}`);
    }
  }
  
  // Línea 135 - Método getStatistics
  async getStatistics() {
    try {
      const query = `
        SELECT 
          estado,
          COUNT(*) as cantidad,
          AVG(puntaje_total) as promedio_nota
        FROM evaluaciones 
        GROUP BY estado
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error getting evaluation statistics: ${error.message}`);
    }
  }

  // Verificar si existe evaluación para un entregable específico
  async existsForDeliverable(deliverableId, evaluatorId) {
    try {
      const evaluation = await this.findOne({
        entregable_id: deliverableId,
        evaluador_id: evaluatorId
      });
      return !!evaluation;
    } catch (error) {
      throw new Error(`Error checking evaluation existence: ${error.message}`);
    }
  }
}

module.exports = Evaluation;