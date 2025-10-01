const Evaluation = require('../models/Evaluation');
const Project = require('../models/Project');
const Entregable = require('../models/Entregable');
const User = require('../models/User');

class EvaluatorController {
  constructor() {
    this.evaluationModel = new Evaluation();
    this.projectModel = new Project();
    this.entregableModel = new Entregable();
    this.userModel = new User();
  }

  // Listar todas las evaluaciones asignadas al evaluador
  async evaluations(req, res) {
    try {
      const evaluatorId = req.session.user.id;
      const { estado, proyecto } = req.query;

      // Obtener evaluaciones con filtros
      let conditions = { evaluador_id: evaluatorId };
      if (estado) conditions.estado = estado;

      const evaluations = await this.evaluationModel.findWithDetails(conditions);

      // Filtrar por proyecto si se especifica
      let filteredEvaluations = evaluations;
      if (proyecto) {
        filteredEvaluations = evaluations.filter(e => 
          e.proyecto_titulo.toLowerCase().includes(proyecto.toLowerCase())
        );
      }

      // Estadísticas (usando estados correctos: 'borrador' y 'finalizada')
      const stats = {
        total: evaluations.length,
        pendientes: evaluations.filter(e => e.estado === 'borrador' || e.estado === null).length,
        completadas: evaluations.filter(e => e.estado === 'finalizada').length,
        vencidas: evaluations.filter(e => {
          // Evaluaciones vencidas: en borrador, sin fecha_evaluacion y creadas hace más de 7 días
          const createdDate = new Date(e.created_at);
          const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
          return (e.estado === 'borrador' || e.estado === null) && 
                 e.fecha_evaluacion === null && 
                 createdDate < sevenDaysAgo;
        }).length
      };

      // Obtener proyectos únicos para el filtro
      const uniqueProjects = [...new Set(evaluations.map(e => e.proyecto_titulo))];

      res.render('evaluator/evaluations', {
        title: 'Mis Evaluaciones',
        user: req.session.user,
        evaluations: filteredEvaluations,
        stats,
        uniqueProjects,
        filters: { estado, proyecto }
      });

    } catch (error) {
      console.error('Error loading evaluations:', error);
      res.status(500).render('errors/500', {
        title: 'Error del Servidor',
        message: 'Error al cargar las evaluaciones'
      });
    }
  }

  // Ver detalle de una evaluación específica
  async evaluationDetail(req, res) {
    try {
      const evaluationId = req.params.id;
      const evaluatorId = req.session.user.id;

      // Obtener evaluación con detalles
      const evaluations = await this.evaluationModel.findWithDetails({ 
        id: evaluationId, 
        evaluador_id: evaluatorId 
      });

      if (!evaluations || evaluations.length === 0) {
        return res.status(404).render('errors/404', {
          title: 'Evaluación no encontrada',
          message: 'La evaluación solicitada no existe o no tienes permisos para verla'
        });
      }

      const evaluation = evaluations[0];

      // Obtener información del proyecto y entregable
      const project = await this.projectModel.findById(evaluation.proyecto_id);
      const deliverable = await this.entregableModel.findById(evaluation.entregable_id);

      // Parsear calificaciones si existen
      let calificaciones = {};
      if (evaluation.calificaciones) {
        try {
          calificaciones = JSON.parse(evaluation.calificaciones);
        } catch (e) {
          console.error('Error parsing calificaciones:', e);
        }
      }

      res.render('evaluator/evaluation-detail', {
        title: `Evaluación - ${evaluation.proyecto_titulo}`,
        user: req.session.user,
        evaluation,
        project,
        deliverable,
        calificaciones
      });

    } catch (error) {
      console.error('Error loading evaluation detail:', error);
      res.status(500).render('errors/500', {
        title: 'Error del Servidor',
        message: 'Error al cargar el detalle de la evaluación'
      });
    }
  }

  // Calificar una evaluación
  async gradeEvaluation(req, res) {
    try {
      const evaluationId = req.params.id;
      const evaluatorId = req.session.user.id;
      const { calificaciones, observaciones, nota_final, estado_evaluacion } = req.body;

      // Verificar que la evaluación pertenece al evaluador
      const evaluations = await this.evaluationModel.findWithDetails({ 
        id: evaluationId, 
        evaluador_id: evaluatorId 
      });

      if (!evaluations || evaluations.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Evaluación no encontrada o sin permisos'
        });
      }

      // Validar datos requeridos
      if (!calificaciones || !nota_final || !estado_evaluacion) {
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos para la evaluación'
        });
      }

      // Validar estado de evaluación
      const estadosValidos = ['aprobada', 'rechazada', 'para_cambios'];
      if (!estadosValidos.includes(estado_evaluacion)) {
        return res.status(400).json({
          success: false,
          message: 'Estado de evaluación inválido'
        });
      }

      // Actualizar evaluación
      const updateData = {
        calificaciones: JSON.stringify(calificaciones),
        observaciones: observaciones || '',
        nota_final: parseFloat(nota_final),
        estado_evaluacion,
        estado: 'completada',
        fecha_evaluacion: new Date(),
        updated_at: new Date()
      };

      await this.evaluationModel.update(evaluationId, updateData);

      // Si la evaluación es rechazada o para cambios, actualizar el entregable
      const evaluation = evaluations[0];
      if (estado_evaluacion === 'rechazada' || estado_evaluacion === 'para_cambios') {
        await this.entregableModel.update(evaluation.entregable_id, {
          estado: 'pendiente',
          observaciones_evaluacion: observaciones
        });
      } else if (estado_evaluacion === 'aprobada') {
        await this.entregableModel.update(evaluation.entregable_id, {
          estado: 'aprobado',
          observaciones_evaluacion: observaciones
        });
      }

      res.json({
        success: true,
        message: 'Evaluación guardada exitosamente',
        redirect: '/evaluator/evaluations'
      });

    } catch (error) {
      console.error('Error grading evaluation:', error);
      res.status(500).json({
        success: false,
        message: 'Error al guardar la evaluación'
      });
    }
  }

  // Ver proyectos donde participa como evaluador
  async projects(req, res) {
    try {
      const evaluatorId = req.session.user.id;

      // Obtener proyectos únicos donde el usuario es evaluador
      const query = `
        SELECT DISTINCT 
          p.*,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          COUNT(ev.id) as total_evaluaciones,
          SUM(CASE WHEN ev.estado = 'pendiente' THEN 1 ELSE 0 END) as evaluaciones_pendientes,
          SUM(CASE WHEN ev.estado = 'completada' THEN 1 ELSE 0 END) as evaluaciones_completadas
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN evaluaciones ev ON p.id = ev.proyecto_id AND ev.evaluador_id = ?
        WHERE p.id IN (
          SELECT DISTINCT proyecto_id 
          FROM evaluaciones 
          WHERE evaluador_id = ?
        )
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;

      const projects = await this.evaluationModel.db.execute(query, [evaluatorId, evaluatorId]);

      res.render('evaluator/projects', {
        title: 'Mis Proyectos de Evaluación',
        user: req.session.user,
        projects: projects[0] || []
      });

    } catch (error) {
      console.error('Error loading evaluator projects:', error);
      res.status(500).render('errors/500', {
        title: 'Error del Servidor',
        message: 'Error al cargar los proyectos'
      });
    }
  }

  // Ver historial de evaluaciones completadas
  async history(req, res) {
    try {
      const evaluatorId = req.session.user.id;

      const completedEvaluations = await this.evaluationModel.findWithDetails({
        evaluador_id: evaluatorId,
        estado: 'finalizada'
      });

      // Estadísticas del historial
      const stats = {
        total: completedEvaluations.length,
        aprobadas: completedEvaluations.filter(e => e.estado_evaluacion === 'aprobada').length,
        rechazadas: completedEvaluations.filter(e => e.estado_evaluacion === 'rechazada').length,
        para_cambios: completedEvaluations.filter(e => e.estado_evaluacion === 'para_cambios').length,
        promedio_nota: completedEvaluations.length > 0 
          ? (completedEvaluations.reduce((sum, e) => sum + (e.nota_final || 0), 0) / completedEvaluations.length).toFixed(2)
          : 0
      };

      res.render('evaluator/history', {
        title: 'Historial de Evaluaciones',
        user: req.session.user,
        evaluations: completedEvaluations,
        stats
      });

    } catch (error) {
      console.error('Error loading evaluation history:', error);
      res.status(500).render('errors/500', {
        title: 'Error del Servidor',
        message: 'Error al cargar el historial'
      });
    }
  }
}

module.exports = EvaluatorController;