const express = require('express');
const router = express.Router();
const EvaluatorController = require('../controllers/EvaluatorController');
const AuthMiddleware = require('../middlewares/auth');

// Crear instancia del controlador
const evaluatorController = new EvaluatorController();

// Aplicar middlewares a todas las rutas
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireRole('Evaluador'));

// Rutas del evaluador

// GET /evaluator/evaluations - Listar evaluaciones asignadas
router.get('/evaluations', 
  evaluatorController.evaluations.bind(evaluatorController)
);

// GET /evaluator/evaluation/:id - Ver detalle de evaluación
router.get('/evaluation/:id', 
  evaluatorController.evaluationDetail.bind(evaluatorController)
);

// POST /evaluator/evaluation/:id/grade - Calificar evaluación
router.post('/evaluation/:id/grade', 
  evaluatorController.gradeEvaluation.bind(evaluatorController)
);

// GET /evaluator/projects - Ver proyectos donde participa como evaluador
router.get('/projects', 
  evaluatorController.projects.bind(evaluatorController)
);

// GET /evaluator/history - Ver historial de evaluaciones completadas
router.get('/history', 
  evaluatorController.history.bind(evaluatorController)
);

module.exports = router;