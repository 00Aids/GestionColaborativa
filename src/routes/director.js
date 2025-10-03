const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middlewares/auth');
const DirectorController = require('../controllers/DirectorController');
const ProjectController = require('../controllers/ProjectController');
const DashboardController = require('../controllers/DashboardController');
const EntregableController = require('../controllers/EntregableController');

// Middleware para verificar que el usuario sea director
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireRole('Director de Proyecto'));

// Instanciar controladores
const directorController = new DirectorController();
const projectController = new ProjectController();
const dashboardController = new DashboardController();
const entregableController = new EntregableController();

// ===== RUTAS PRINCIPALES =====

// Listar proyectos dirigidos
router.get('/projects', directorController.projects.bind(directorController));

// Listar entregables de proyectos dirigidos
router.get('/deliverables', directorController.deliverables.bind(directorController));

// Listar evaluaciones de proyectos dirigidos
router.get('/evaluations', directorController.evaluations.bind(directorController));

// ===== RUTAS DE DETALLE DE PROYECTO =====
router.get('/projects/:projectId', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const user = req.session.user;
    
    // Verificar que el proyecto sea dirigido por este director
    const project = await directorController.getProjectById(projectId, user.id);
    if (!project) {
      req.flash('error', 'No tienes permisos para ver este proyecto');
      return res.redirect('/director/projects');
    }
    
    // Obtener entregables del proyecto
    const deliverables = await directorController.getDeliverablesByProject(projectId);
    
    // Obtener evaluaciones del proyecto
    const evaluations = await directorController.getEvaluationsByProject(projectId);
    
    res.render('director/project-detail', {
      title: `Proyecto: ${project.titulo}`,
      project: project,
      deliverables: deliverables || [],
      evaluations: evaluations || [],
      user: user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error loading project detail:', error);
    req.flash('error', 'Error al cargar el detalle del proyecto');
    res.redirect('/director/projects');
  }
});

// ===== API ENDPOINTS =====

// API para obtener proyectos dirigidos
router.get('/api/projects', async (req, res) => {
  try {
    const user = req.session.user;
    const projects = await directorController.getProjectsByDirector(user.id);
    res.json({ success: true, projects: projects || [] });
  } catch (error) {
    console.error('Error in director projects API:', error);
    res.status(500).json({ success: false, message: 'Error al obtener proyectos' });
  }
});

// API para obtener entregables de un proyecto específico
router.get('/api/projects/:projectId/deliverables', async (req, res) => {
  try {
    const projectId = req.params.projectId;
    const user = req.session.user;
    
    // Verificar que el proyecto sea dirigido por este director
    const project = await directorController.getProjectById(projectId, user.id);
    if (!project) {
      return res.status(403).json({ success: false, message: 'No tienes permisos para ver este proyecto' });
    }
    
    const deliverables = await directorController.getDeliverablesByProject(projectId);
    res.json({ success: true, deliverables: deliverables || [] });
  } catch (error) {
    console.error('Error in director deliverables API:', error);
    res.status(500).json({ success: false, message: 'Error al obtener entregables' });
  }
});

// API para agregar comentario a entregable (como director)
router.post('/api/deliverables/:deliverableId/comments', entregableController.addComment.bind(entregableController));

// API para revisar entregable (approve/reject/request_changes)
router.post('/api/deliverables/:deliverableId/review', entregableController.updateDeliverableStatus.bind(entregableController));

module.exports = router;