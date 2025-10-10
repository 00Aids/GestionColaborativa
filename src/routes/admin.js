const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const DashboardController = require('../controllers/DashboardController'); // Agregar esta línea
const AuthMiddleware = require('../middlewares/auth');
const { loadUserAreas } = require('../middlewares/areaAuth');
const uploadMiddleware = require('../middlewares/upload');
const { uploadTasks, handleTaskMulterError } = require('../middlewares/uploadTasks');

// Instanciar los controladores
const adminController = new AdminController();
const dashboardController = new DashboardController(); // Agregar esta línea

// Todas las rutas admin requieren autenticación y rol de Administrador General
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireRole('Administrador General'));
// Cargar las áreas de trabajo del usuario administrador para filtrar datos
router.use(loadUserAreas);

// Ruta del dashboard de administrador
router.get('/dashboard', dashboardController.adminDashboard.bind(dashboardController));

// Rutas de gestión de usuarios
router.get('/users', adminController.users.bind(adminController));
router.get('/users/new', adminController.newUser.bind(adminController));
router.post('/users/:userId/toggle-status', adminController.toggleUserStatus.bind(adminController));
router.post('/users/:userId/change-role', adminController.changeUserRole.bind(adminController));

// API route para obtener usuarios por rol (devuelve JSON)
router.get('/api/users', adminController.getUsersByRole.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE PROYECTOS
// =============================================

// Página principal de gestión de proyectos
router.get('/projects', adminController.projects.bind(adminController));

// Exportar proyectos a Excel
router.get('/projects/export', adminController.exportProjects.bind(adminController));

// Mostrar formulario para crear nuevo proyecto
router.get('/projects/new', adminController.newProject.bind(adminController));

// Crear nuevo proyecto
router.post('/projects', adminController.createProject.bind(adminController));

// Obtener detalles de un proyecto específico (para mostrar la página)
router.get('/projects/:projectId/details', adminController.showProjectDetails.bind(adminController));

// Mostrar formulario para editar proyecto
router.get('/projects/:projectId/edit', adminController.showEditProject.bind(adminController));

// Obtener detalles de un proyecto específico (para API JSON)
router.get('/projects/:projectId/api', adminController.getProjectDetails.bind(adminController));

// Actualizar proyecto completo
router.put('/projects/:projectId', adminController.updateProject.bind(adminController));

// Cambiar solo el estado del proyecto
router.post('/projects/:projectId/status', adminController.changeProjectStatus.bind(adminController));

// Completar proyecto
router.post('/projects/:projectId/complete', adminController.completeProject.bind(adminController));

// Eliminar proyecto (soft delete)
router.delete('/projects/:projectId', adminController.deleteProject.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE ROLES
// =============================================

// Página principal de gestión de roles
router.get('/roles', adminController.roles.bind(adminController));

// API para obtener roles disponibles (JSON)
router.get('/api/roles', adminController.getRolesAPI.bind(adminController));

// Crear nuevo rol
router.post('/roles', adminController.createRole.bind(adminController));

// Obtener detalles de un rol específico
router.get('/roles/:roleId/details', adminController.getRoleDetails.bind(adminController));

// Actualizar rol completo
router.put('/roles/:roleId', adminController.updateRole.bind(adminController));

// Cambiar estado del rol (activar/desactivar)
router.post('/roles/:roleId/toggle-status', adminController.toggleRoleStatus.bind(adminController));

// Eliminar rol
router.delete('/roles/:roleId', adminController.deleteRole.bind(adminController));

// =============================================
// RUTAS DE CALENDARIO DE TAREAS
// =============================================

// Página principal del calendario
router.get('/calendar', adminController.calendar.bind(adminController));

// API para obtener tareas del calendario
router.get('/calendar/tasks', adminController.getCalendarTasks.bind(adminController));

// API para crear nueva tarea
router.post('/calendar/tasks', adminController.createCalendarTask.bind(adminController));

// API para actualizar tarea
router.put('/calendar/tasks/:taskId', adminController.updateCalendarTask.bind(adminController));

// API para eliminar tarea
router.delete('/calendar/tasks/:taskId', adminController.deleteCalendarTask.bind(adminController));

// API para obtener detalles de una tarea específica
router.get('/calendar/tasks/:taskId/details', adminController.getTaskDetails.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE INVITACIONES
// =============================================

// Página principal de gestión de invitaciones
router.get('/invitations', adminController.invitations.bind(adminController));

// API para obtener invitaciones de un proyecto
router.get('/invitations/:projectId', adminController.getProjectInvitations.bind(adminController));

// API para obtener invitaciones de un proyecto (ruta alternativa)
router.get('/projects/:projectId/invitations', adminController.getProjectInvitations.bind(adminController));

// API para crear nueva invitación
router.post('/invitations', adminController.createInvitation.bind(adminController));

// API para actualizar invitación (activar/desactivar)
router.put('/invitations/:invitationId', adminController.updateInvitation.bind(adminController));

// API para eliminar invitación
router.delete('/invitations/:invitationId', adminController.deleteInvitation.bind(adminController));

// API para obtener estadísticas de invitaciones
router.get('/invitations/stats/:projectId', adminController.getInvitationStats.bind(adminController));

// API para obtener miembros de un proyecto
router.get('/projects/:projectId/members', adminController.getProjectMembers.bind(adminController));

// API para remover miembro de un proyecto
router.delete('/projects/:projectId/members/:userId', adminController.removeMember.bind(adminController));

// API para reactivar miembro de un proyecto
router.put('/projects/:projectId/members/:userId/reactivate', adminController.reactivateMember.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE LÍNEAS DE INVESTIGACIÓN
// =============================================

// Página principal de gestión de líneas de investigación
router.get('/research-lines', adminController.researchLines.bind(adminController));

// API para crear nueva línea de investigación
router.post('/research-lines', adminController.createResearchLine.bind(adminController));

// API para actualizar línea de investigación
router.put('/research-lines/:lineId', adminController.updateResearchLine.bind(adminController));

// API para eliminar línea de investigación
router.delete('/research-lines/:lineId', adminController.deleteResearchLine.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE CICLOS ACADÉMICOS
// =============================================

// Página principal de gestión de ciclos académicos
router.get('/academic-cycles', adminController.academicCycles.bind(adminController));

// API para crear nuevo ciclo académico
router.post('/academic-cycles', adminController.createAcademicCycle.bind(adminController));

// API para actualizar ciclo académico
router.put('/academic-cycles/:cycleId', adminController.updateAcademicCycle.bind(adminController));

// API para eliminar ciclo académico
router.delete('/academic-cycles/:cycleId', adminController.deleteAcademicCycle.bind(adminController));

// Rutas futuras para otras funcionalidades admin
router.get('/reports', adminController.reports.bind(adminController));
router.get('/backup', adminController.backup.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE ENTREGABLES
// =============================================

// Página principal de entregables (con filtros)
router.get('/deliverables', adminController.deliverables.bind(adminController));

// Ver detalles de un entregable específico
router.get('/deliverables/:deliverableId', adminController.showDeliverableDetails.bind(adminController));

// Actualizar estado de entregable
router.post('/deliverables/:deliverableId/status', adminController.updateDeliverableStatus.bind(adminController));

// =============================================
// RUTAS DE GESTIÓN DE TAREAS (WORKFLOW JIRA)
// =============================================

// Mostrar formulario para crear nueva tarea
router.get('/projects/:projectId/tasks/new', adminController.showNewTask.bind(adminController));

// Crear nuevo proyecto
router.post('/projects/:projectId/tasks', uploadTasks, handleTaskMulterError, adminController.createTask.bind(adminController));

// Obtener vista Kanban de tareas de un proyecto
router.get('/projects/:projectId/tasks/kanban', adminController.showTaskKanban.bind(adminController));

// API para obtener tareas de un proyecto en formato JSON
router.get('/api/projects/:projectId/tasks', adminController.getProjectTasksAPI.bind(adminController));

// Actualizar estado de workflow de una tarea (drag & drop)
router.put('/api/tasks/:taskId/workflow-status', adminController.updateTaskWorkflowStatus.bind(adminController));

// Asignar tarea a usuario
router.put('/api/tasks/:taskId/assign', adminController.assignTask.bind(adminController));

// Completar tarea con archivos y descripción
router.post('/api/tasks/:taskId/complete', adminController.completeTask.bind(adminController));

// Agregar comentario a una tarea
router.post('/api/tasks/:taskId/comments', uploadMiddleware.single('archivo'), adminController.addTaskComment.bind(adminController));

// Obtener comentarios de una tarea
router.get('/api/tasks/:taskId/comments', adminController.getTaskComments.bind(adminController));

// Obtener historial de una tarea
router.get('/api/tasks/:taskId/history', adminController.getTaskHistory.bind(adminController));



// Obtener detalles completos de una tarea (modal)
router.get('/api/tasks/:taskId/details', adminController.getTaskDetails.bind(adminController));

// Actualizar tarea completa
router.put('/api/tasks/:taskId', adminController.updateTask.bind(adminController));

// Eliminar tarea
router.delete('/api/tasks/:taskId', adminController.deleteTask.bind(adminController));

// Crear tarea rápida desde Kanban
router.post('/api/projects/:projectId/tasks/quick', uploadTasks, handleTaskMulterError, adminController.createQuickTask.bind(adminController));

// =============================================
// API ENDPOINTS PARA CREACIÓN RÁPIDA
// =============================================

// API para crear línea de investigación desde formulario de proyecto
router.post('/api/lineas-investigacion', adminController.createResearchLineAPI.bind(adminController));

// API para crear ciclo académico desde formulario de proyecto
router.post('/api/ciclos-academicos', adminController.createAcademicCycleAPI.bind(adminController));

router.get('/settings', adminController.settings.bind(adminController));
router.post('/settings', adminController.updateSettings.bind(adminController));

module.exports = router;