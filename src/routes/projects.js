const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/ProjectController');
const AdminController = require('../controllers/AdminController');
const AuthMiddleware = require('../middlewares/auth');
const { loadUserAreas } = require('../middlewares/areaAuth');

// Crear instancia del controlador
const projectController = new ProjectController();
const adminController = new AdminController();

// Aplicar middleware para cargar áreas de trabajo del usuario
router.use(loadUserAreas);

// IMPORTANTE: Las rutas específicas deben ir ANTES que las rutas con parámetros
router.get('/create', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Administrador General', 'Director de Proyecto']),
  adminController.newProject.bind(adminController)
);

router.post('/create', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Administrador General', 'Director de Proyecto']),
  adminController.createProject.bind(adminController)
);

// Rutas para sistema de invitaciones
router.get('/join', 
  AuthMiddleware.requireRole(['Estudiante', 'Coordinador Académico', 'Director de Proyecto']),
  projectController.showJoinForm.bind(projectController)
);

router.post('/join', 
  AuthMiddleware.requireRole(['Estudiante', 'Coordinador Académico', 'Director de Proyecto']),
  projectController.joinWithCode.bind(projectController)
);

// Rutas de invitaciones públicas (sin autenticación para aceptar/rechazar)
router.get('/invitations/accept/:codigo', 
  projectController.showAcceptInvitation.bind(projectController)
);

router.post('/invitations/accept/:codigo', 
  AuthMiddleware.requireAuth,
  projectController.acceptInvitation.bind(projectController)
);

router.post('/invitations/reject/:codigo', 
  projectController.rejectInvitation.bind(projectController)
);

// Rutas para registro y login desde invitaciones (sin autenticación previa)
router.post('/invitations/register/:codigo', 
  projectController.registerFromInvitation.bind(projectController)
);

router.post('/invitations/login/:codigo', 
  projectController.loginFromInvitation.bind(projectController)
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

// Redirigir la ruta antigua a la nueva vista unificada
router.get('/:id/detail', 
  AuthMiddleware.requireAuth,
  (req, res) => {
    res.redirect(`/projects/${req.params.id}`);
  }
);

// Gestión de invitaciones del proyecto
router.get('/:id/invitations', 
  AuthMiddleware.requireAuth,
  projectController.getProjectInvitations.bind(projectController)
);

// Crear nueva invitación
router.post('/:id/invitations', 
  AuthMiddleware.requireAuth,
  projectController.createInvitation.bind(projectController)
);

// Generar código de invitación rápido
router.post('/:id/invitations/quick', 
  AuthMiddleware.requireAuth,
  projectController.generateQuickInvitation.bind(projectController)
);

// Enviar invitación por email
router.post('/:id/invitations/email', 
  AuthMiddleware.requireAuth,
  projectController.sendEmailInvitation.bind(projectController)
);

// Eliminar/desactivar invitación
router.delete('/:projectId/invitations/:invitationId', 
  AuthMiddleware.requireAuth,
  projectController.deactivateInvitation.bind(projectController)
);

// Actualizar estado del proyecto
router.post('/:id/status', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Director de Proyecto']),
  projectController.updateStatus.bind(projectController)
);

// =============================================
// GESTIÓN DE ENTREGABLES DEL PROYECTO
// =============================================

// Obtener entregables del proyecto (API)
router.get('/:id/deliverables', 
  AuthMiddleware.requireAuth,
  projectController.getProjectDeliverables.bind(projectController)
);

// Crear nuevo entregable
router.post('/:id/deliverables', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Director de Proyecto', 'Estudiante']),
  projectController.createDeliverable.bind(projectController)
);

// Actualizar entregable
router.put('/:id/deliverables/:deliverableId', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Director de Proyecto', 'Estudiante']),
  projectController.updateDeliverable.bind(projectController)
);

// Eliminar entregable
router.delete('/:id/deliverables/:deliverableId', 
  AuthMiddleware.requireRole(['Coordinador Académico', 'Director de Proyecto']),
  projectController.deleteDeliverable.bind(projectController)
);

// =============================================
// GESTIÓN DE COMENTARIOS
// =============================================

// Comentarios de proyectos
router.get('/:projectId/comments', 
  AuthMiddleware.requireAuth,
  projectController.getProjectComments.bind(projectController)
);

router.post('/:projectId/comments', 
  AuthMiddleware.requireAuth,
  projectController.addProjectComment.bind(projectController)
);

// Comentarios de entregables
router.get('/deliverables/:deliverableId/comments', 
  AuthMiddleware.requireAuth,
  projectController.getDeliverableComments.bind(projectController)
);

router.post('/deliverables/:deliverableId/comments', 
  AuthMiddleware.requireAuth,
  projectController.addDeliverableComment.bind(projectController)
);

module.exports = router;