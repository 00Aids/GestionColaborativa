const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const AuthMiddleware = require('../middlewares/auth');

// Instanciar el controlador
const dashboardController = new DashboardController();

// Todas las rutas requieren autenticación
router.use(AuthMiddleware.requireAuth);

// Dashboard principal (redirige según el rol)
router.get('/', dashboardController.index.bind(dashboardController));

// Dashboards específicos por rol
// Asegúrate de que esta línea esté presente
router.get('/admin',
  AuthMiddleware.requireAuth,
  AuthMiddleware.requireRole('Administrador General'),
  dashboardController.adminDashboard.bind(dashboardController)
);

router.get('/coordinator',
  AuthMiddleware.requireRole('Coordinador Académico'),
  dashboardController.coordinatorDashboard.bind(dashboardController)
);

router.get('/director',
  AuthMiddleware.requireRole('Director de Proyecto'),
  dashboardController.directorDashboard.bind(dashboardController)
);

router.get('/evaluator',
  AuthMiddleware.requireRole('Evaluador'),
  dashboardController.evaluatorDashboard.bind(dashboardController)
);

router.get('/student',
  AuthMiddleware.requireRole('Estudiante'),
  dashboardController.studentDashboard.bind(dashboardController)
);

// Ruta para el dashboard Kanban
router.get('/kanban', AuthMiddleware.requireAuth, dashboardController.kanbanDashboard.bind(dashboardController));

// API endpoint para actualizar estado de tareas
router.post('/api/tasks/update-status', AuthMiddleware.requireAuth, dashboardController.updateTaskStatus.bind(dashboardController));

// Rutas CRUD para tareas
router.get('/api/tasks/:id', AuthMiddleware.requireAuth, dashboardController.getTask.bind(dashboardController));
router.post('/api/tasks', AuthMiddleware.requireAuth, dashboardController.createTask.bind(dashboardController));
router.put('/api/tasks/:id', AuthMiddleware.requireAuth, dashboardController.updateTask.bind(dashboardController));
router.delete('/api/tasks/:id', AuthMiddleware.requireAuth, dashboardController.deleteTask.bind(dashboardController));

module.exports = router;