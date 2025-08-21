const Project = require('../models/Project');
const User = require('../models/User');
const Deliverable = require('../models/Deliverable');
const Evaluation = require('../models/Evaluation');

class ProjectController {
  constructor() {
    this.projectModel = new Project();
    this.userModel = new User();
    this.deliverableModel = new Deliverable();
    this.evaluationModel = new Evaluation();
  }

  // Listar proyectos
  async index(req, res) {
    try {
      const user = req.session.user;
      const { search, estado, page = 1 } = req.query;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      let projects;
      
      if (search) {
        projects = await this.projectModel.search(search);
      } else {
        const conditions = estado ? { estado } : {};
        projects = await this.projectModel.findWithDetails(conditions);
      }
      
      // Filtrar según el rol del usuario
      if (user.rol_nombre === 'Estudiante') {
        projects = projects.filter(project => project.estudiante_id === user.id);
      } else if (user.rol_nombre === 'Director de Proyecto') { // ← CAMBIO AQUÍ
        projects = projects.filter(project => project.director_id === user.id);
      }
      
      // Paginación simple
      const totalProjects = projects.length;
      const paginatedProjects = projects.slice(offset, offset + limit);
      const totalPages = Math.ceil(totalProjects / limit);
      
      res.render('projects/index', {
        title: 'Proyectos',
        user,
        projects: paginatedProjects,
        currentPage: parseInt(page),
        totalPages,
        search,
        estado,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Mostrar formulario de creación
  async showCreate(req, res) {
    try {
      const user = req.session.user;
      
      // Permitir a Estudiantes, Coordinadores y Administradores crear proyectos
      if (!['Estudiante', 'Coordinador Académico', 'Administrador General'].includes(user.rol_nombre)) {
        req.flash('error', 'No tienes permisos para crear proyectos');
        return res.redirect('/projects');
      }
      
      // Obtener datos necesarios para el formulario
      const [directors, lineasResult, ciclosResult] = await Promise.all([
        this.userModel.findByRole('Director de Proyecto'), // ← CAMBIO AQUÍ
        this.userModel.db.execute('SELECT * FROM lineas_investigacion WHERE activo = 1'),
        this.userModel.db.execute('SELECT * FROM ciclos_academicos WHERE activo = 1')
      ]);
      
      res.render('projects/create', {
        title: 'Crear Proyecto',
        user,
        directors: directors || [],
        lineasInvestigacion: lineasResult[0] || [],
        ciclosAcademicos: ciclosResult[0] || [],
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error showing create project:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Crear proyecto
  async create(req, res) {
    try {
      const user = req.session.user;
      const {
        titulo,
        descripcion,
        objetivos,
        director_id,
        linea_investigacion_id,
        ciclo_academico_id
      } = req.body;
      
      // Validaciones mejoradas
      if (!titulo || !descripcion || !objetivos || !director_id) {
        req.flash('error', 'Los campos Título, Descripción, Objetivos y Director son obligatorios');
        return res.redirect('/projects/create');
      }
      
      // Validar que el título no esté vacío después de trim
      if (titulo.trim().length === 0) {
        req.flash('error', 'El título del proyecto no puede estar vacío');
        return res.redirect('/projects/create');
      }
      
      const projectData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        objetivos: objetivos.trim(),
        estudiante_id: user.id,
        director_id: parseInt(director_id),
        linea_investigacion_id: linea_investigacion_id ? parseInt(linea_investigacion_id) : null,
        ciclo_academico_id: ciclo_academico_id ? parseInt(ciclo_academico_id) : null,
        estado: 'borrador'
      };
      
      const project = await this.projectModel.create(projectData);
      
      req.flash('success', 'Proyecto creado exitosamente');
      res.redirect(`/projects/${project.id}`);
      
    } catch (error) {
      console.error('Error creating project:', error);
      req.flash('error', 'Error al crear el proyecto: ' + error.message);
      res.redirect('/projects/create');
    }
  }

  // Mostrar proyecto específico
  async show(req, res) {
    try {
      const user = req.session.user;
      const projectId = req.params.id;
      
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      const project = projects[0];
      
      if (!project) {
        req.flash('error', 'Proyecto no encontrado');
        return res.redirect('/projects');
      }
      
      // Verificar permisos
      if (user.rol_nombre === 'Estudiante' && project.estudiante_id !== user.id) {
        req.flash('error', 'No tienes permisos para ver este proyecto');
        return res.redirect('/projects');
      }
      
      if (user.rol_nombre === 'Director' && project.director_id !== user.id) {
        req.flash('error', 'No tienes permisos para ver este proyecto');
        return res.redirect('/projects');
      }
      
      // Obtener entregables y evaluaciones
      const deliverables = await this.deliverableModel.findByProject(projectId);
      const evaluations = await this.evaluationModel.findByProject(projectId);
      
      res.render('projects/show', {
        title: `Proyecto: ${project.titulo}`,
        user,
        project,
        deliverables,
        evaluations,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error showing project:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Actualizar estado del proyecto
  async updateStatus(req, res) {
    try {
      const user = req.session.user;
      const { id } = req.params;
      const { estado } = req.body;
      
      if (!['Coordinador Académico', 'Administrador General'].includes(user.rol_nombre)) {
        req.flash('error', 'No tienes permisos para actualizar el estado del proyecto');
        return res.redirect('/projects');
      }
      
      await this.projectModel.updateStatus(projectId, estado, observaciones);
      
      req.flash('success', 'Estado del proyecto actualizado exitosamente');
      res.redirect(`/projects/${projectId}`);
      
    } catch (error) {
      console.error('Error updating project status:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }
}

module.exports = ProjectController;