const express = require('express');
const router = express.Router();
const AuthMiddleware = require('../middlewares/auth');
const ProjectController = require('../controllers/ProjectController');
const DashboardController = require('../controllers/DashboardController');
const EntregableController = require('../controllers/EntregableController');

// Middleware para verificar que el usuario sea coordinador
router.use(AuthMiddleware.requireAuth);
router.use(AuthMiddleware.requireRole('Coordinador Académico'));

const projectController = new ProjectController();
const dashboardController = new DashboardController();
const entregableController = new EntregableController();

// ===== RUTAS DE PROYECTOS =====
router.get('/projects', async (req, res) => {
  try {
    // Obtener proyectos asignados al coordinador
    const projects = await projectController.getProjectsByCoordinator(req.user.id);
    res.render('coordinator/projects', {
      title: 'Gestionar Proyectos',
      projects: projects || [],
      user: req.user,
      success: req.flash('success'),
      error: req.flash('error')
    });
  } catch (error) {
    console.error('Error loading coordinator projects:', error);
    req.flash('error', 'Error al cargar los proyectos');
    res.redirect('/dashboard/coordinator');
  }
});

// ===== RUTAS DE ESTUDIANTES =====
router.get('/students', async (req, res) => {
  try {
    // Usar el método coordinatorStudents del DashboardController
    await dashboardController.coordinatorStudents(req, res);
  } catch (error) {
    console.error('Error loading coordinator students:', error);
    req.flash('error', 'Error al cargar los estudiantes');
    res.redirect('/dashboard/coordinator');
  }
});

// ===== RUTAS DE EVALUACIONES =====
router.get('/evaluations', async (req, res) => {
  try {
    // Usar el método coordinatorEvaluations del DashboardController
    await dashboardController.coordinatorEvaluations(req, res);
  } catch (error) {
    console.error('Error loading coordinator evaluations:', error);
    req.flash('error', 'Error al cargar las evaluaciones');
    res.redirect('/dashboard/coordinator');
  }
});

// ===== RUTAS DE REPORTES =====
router.get('/reports', async (req, res) => {
  try {
    // Usar el método coordinatorReports del DashboardController
    await dashboardController.coordinatorReports(req, res);
  } catch (error) {
    console.error('Error loading coordinator reports:', error);
    req.flash('error', 'Error al cargar los reportes');
    res.redirect('/dashboard/coordinator');
  }
});

// ===== RUTAS DE CALENDARIO =====
router.get('/calendar', async (req, res) => {
  try {
    // Usar el método coordinatorCalendar del DashboardController
    await dashboardController.coordinatorCalendar(req, res);
  } catch (error) {
    console.error('Error loading coordinator calendar:', error);
    req.flash('error', 'Error al cargar el calendario');
    res.redirect('/dashboard/coordinator');
  }
});

// ===== RUTAS DE REVISIÓN DE ENTREGABLES =====
router.get('/deliverables', async (req, res) => {
  try {
    await entregableController.coordinatorReview(req, res);
  } catch (error) {
    console.error('Error loading coordinator deliverable review:', error);
    req.flash('error', 'Error al cargar la revisión de entregables');
    res.redirect('/dashboard/coordinator');
  }
});

// ===== API ENDPOINTS =====

// API para obtener proyectos del coordinador
router.get('/api/projects', async (req, res) => {
  try {
    const projects = await projectController.getProjectsByCoordinator(req.user.id);
    res.json({ success: true, projects: projects || [] });
  } catch (error) {
    console.error('Error in coordinator projects API:', error);
    res.status(500).json({ success: false, error: 'Error al obtener proyectos' });
  }
});

// API para actualizar estado de entregable
router.post('/api/deliverables/:deliverableId/status', async (req, res) => {
  try {
    await entregableController.updateDeliverableStatus(req, res);
  } catch (error) {
    console.error('Error updating deliverable status:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// API para obtener detalles de entregable
router.get('/api/deliverables/:deliverableId', async (req, res) => {
  try {
    await entregableController.getDeliverableDetails(req, res);
  } catch (error) {
    console.error('Error getting deliverable details:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

// API para agregar comentario a entregable
router.post('/api/deliverables/:deliverableId/comments', async (req, res) => {
  try {
    await entregableController.addComment(req, res);
  } catch (error) {
    console.error('Error adding deliverable comment:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
});

module.exports = router;