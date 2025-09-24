const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const AuthMiddleware = require('../middlewares/auth');
const { loadUserAreas } = require('../middlewares/areaAuth');

// Instanciar el controlador
const dashboardController = new DashboardController();

// Todas las rutas requieren autenticación y rol de estudiante
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireRole('Estudiante'));
router.use(loadUserAreas); // Cargar áreas de trabajo del usuario

// Rutas de estudiante
router.get('/projects', dashboardController.studentProjects.bind(dashboardController));
router.get('/deliverables', dashboardController.studentDeliverables.bind(dashboardController));
router.get('/evaluations', dashboardController.studentEvaluations.bind(dashboardController));
router.get('/profile', dashboardController.studentProfile.bind(dashboardController));

// Rutas para acciones específicas
router.post('/deliverables/upload', dashboardController.uploadDeliverable.bind(dashboardController));
router.put('/profile/update', dashboardController.updateStudentProfile.bind(dashboardController));

module.exports = router;