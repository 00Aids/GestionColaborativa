const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/ProjectController');
const AuthMiddleware = require('../middlewares/auth');

// Crear instancia del controlador
const projectController = new ProjectController();

// IMPORTANTE: Las rutas específicas deben ir ANTES que las rutas con parámetros
router.get('/create', 
  AuthMiddleware.requireRole(['Estudiante', 'Coordinador Académico', 'Administrador General']),
  projectController.showCreate.bind(projectController)
);

router.post('/create', 
  AuthMiddleware.requireRole(['Estudiante', 'Coordinador Académico', 'Administrador General']),
  projectController.create.bind(projectController)
);

// Rutas de proyectos
router.get('/', 
  AuthMiddleware.requireAuth,
  projectController.index.bind(projectController)
);

router.get('/:id', 
  AuthMiddleware.requireAuth,
  projectController.show.bind(projectController)
);

// Actualizar estado del proyecto
router.post('/:id/status', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Director de Proyecto']),
  projectController.updateStatus.bind(projectController)
);

module.exports = router;