const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const AuthMiddleware = require('../middlewares/auth');

// Instanciar el controlador
const adminController = new AdminController();

// Todas las rutas admin requieren autenticación y rol de Administrador General
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireRole('Administrador General'));

// Rutas de gestión de usuarios
router.get('/users', adminController.users.bind(adminController));
router.post('/users/:userId/toggle-status', adminController.toggleUserStatus.bind(adminController));
router.post('/users/:userId/change-role', adminController.changeUserRole.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE PROYECTOS
// =============================================

// Página principal de gestión de proyectos
router.get('/projects', adminController.projects.bind(adminController));

// Crear nuevo proyecto
router.post('/projects', adminController.createProject.bind(adminController));

// Obtener detalles de un proyecto específico
router.get('/projects/:projectId/details', adminController.getProjectDetails.bind(adminController));

// Actualizar proyecto completo
router.put('/projects/:projectId', adminController.updateProject.bind(adminController));

// Cambiar solo el estado del proyecto
router.post('/projects/:projectId/status', adminController.changeProjectStatus.bind(adminController));

// Eliminar proyecto (soft delete)
router.delete('/projects/:projectId', adminController.deleteProject.bind(adminController));

// Rutas futuras para otras funcionalidades admin
// router.get('/reports', adminController.reports.bind(adminController));
// router.get('/settings', adminController.settings.bind(adminController));

module.exports = router;