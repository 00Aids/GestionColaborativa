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

// Rutas para sistema de invitaciones
router.get('/join', 
  AuthMiddleware.requireRole(['Estudiante']),
  projectController.showJoinForm.bind(projectController)
);

router.post('/join', 
  AuthMiddleware.requireRole(['Estudiante']),
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

module.exports = router;