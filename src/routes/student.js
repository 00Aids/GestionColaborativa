const express = require('express');
const router = express.Router();
const DashboardController = require('../controllers/DashboardController');
const AuthMiddleware = require('../middlewares/auth');
const { loadUserAreas } = require('../middlewares/areaAuth');
const { upload: uploadDeliverables, handleError } = require('../middlewares/uploadDeliverables');

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
router.post('/deliverables/upload', uploadDeliverables.array('files', 5), handleError, dashboardController.uploadDeliverable.bind(dashboardController));
router.put('/profile/update', dashboardController.updateStudentProfile.bind(dashboardController));
router.post('/profile/password', dashboardController.changeStudentPassword.bind(dashboardController));
router.post('/profile/additional-info', dashboardController.updateAdditionalInfo.bind(dashboardController));

module.exports = router;