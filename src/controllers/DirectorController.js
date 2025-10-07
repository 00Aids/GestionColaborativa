const Project = require('../models/Project');
const User = require('../models/User');
const Entregable = require('../models/Entregable');

const pool = require('../config/database');

class DirectorController {
  constructor() {
    this.projectModel = new Project();
    this.userModel = new User();
    this.entregableModel = new Entregable();

  }

  // ===== GESTIÓN DE PROYECTOS DIRIGIDOS =====

  // Listar proyectos dirigidos por el director
  async projects(req, res) {
    try {
      const user = req.session.user;
      const { search, estado, page = 1 } = req.query;
      const limit = 10;
      const offset = (page - 1) * limit;

      // Obtener proyectos donde este usuario es miembro con rol de director
      let query = `
        SELECT DISTINCT
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        INNER JOIN project_members pm ON p.id = pm.proyecto_id
        WHERE pm.usuario_id = ? AND pm.rol_en_proyecto = 'director' AND pm.activo = 1
      `;
      
      const values = [user.id];
      
      // Aplicar filtro de estado si existe
      if (estado) {
        query += ` AND p.estado = ?`;
        values.push(estado);
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [directedProjects] = await this.projectModel.db.execute(query, values);

      // Aplicar búsqueda por título si se especifica
      let filteredProjects = directedProjects;
      if (search) {
        filteredProjects = directedProjects.filter(project => 
          project.titulo.toLowerCase().includes(search.toLowerCase())
        );
      }

      // Calcular estadísticas
      const stats = {
        total: filteredProjects.length,
        activos: filteredProjects.filter(p => ['en_desarrollo', 'en_revision'].includes(p.estado)).length,
        finalizados: filteredProjects.filter(p => p.estado === 'finalizado').length,
        pendientes: filteredProjects.filter(p => p.estado === 'borrador').length
      };

      // Paginación
      const totalProjects = filteredProjects.length;
      const paginatedProjects = filteredProjects.slice(offset, offset + limit);
      const totalPages = Math.ceil(totalProjects / limit);

      res.render('director/projects', {
        title: 'Proyectos Dirigidos',
        user,
        projects: paginatedProjects,
        stats,
        currentPage: parseInt(page),
        totalPages,
        search,
        estado,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error loading director projects:', error);
      req.flash('error', 'Error al cargar los proyectos dirigidos');
      res.redirect('/dashboard/director');
    }
  }

  // Obtener proyectos dirigidos (API)
  async getProjectsByDirector(directorId) {
    try {
      return await this.projectModel.findByDirector(directorId);
    } catch (error) {
      console.error('Error getting projects by director:', error);
      throw error;
    }
  }

  // ===== GESTIÓN DE ENTREGABLES =====

  // Listar entregables de proyectos dirigidos
  async deliverables(req, res) {
    try {
      const user = req.session.user;
      const { estado, proyecto, search, page = 1 } = req.query;
      const limit = 15;
      const offset = (page - 1) * limit;

      // Obtener proyectos dirigidos
      const directedProjects = await this.projectModel.findByDirector(user.id);
      const projectIds = directedProjects.map(p => p.id);

      if (projectIds.length === 0) {
        return res.render('director/deliverables', {
          title: 'Entregables de Proyectos Dirigidos',
          user,
          deliverables: [],
          projects: [],
          stats: { total: 0, pendientes: 0, aprobados: 0, rechazados: 0 },
          currentPage: 1,
          totalPages: 0,
          estado,
          proyecto,
          search,
          success: req.flash('success'),
          error: req.flash('error')
        });
      }

      // Obtener entregables de todos los proyectos dirigidos
      let allDeliverables = [];
      for (const project of directedProjects) {
        const deliverables = await this.entregableModel.findByProject(project.id);
        if (deliverables && deliverables.length > 0) {
          // Agregar información del proyecto a cada entregable
          const deliverablesWithProject = deliverables.map(deliverable => ({
            ...deliverable,
            proyecto_titulo: project.titulo,
            estudiante_nombres: project.estudiante_nombres,
            estudiante_apellidos: project.estudiante_apellidos
          }));
          allDeliverables.push(...deliverablesWithProject);
        }
      }

      // Aplicar filtros
      if (estado) {
        allDeliverables = allDeliverables.filter(d => d.estado === estado);
      }
      if (proyecto) {
        allDeliverables = allDeliverables.filter(d => d.proyecto_id == proyecto);
      }
      if (search) {
        const term = String(search).toLowerCase();
        allDeliverables = allDeliverables.filter(d => {
          const entregableTitulo = ((d.titulo || d.nombre || '')).toLowerCase();
          const proyectoTitulo = ((d.proyecto_titulo || '')).toLowerCase();
          const estudianteNombre = (((d.estudiante_nombres || '') + ' ' + (d.estudiante_apellidos || '')).trim()).toLowerCase();
          return entregableTitulo.includes(term) || proyectoTitulo.includes(term) || estudianteNombre.includes(term);
        });
      }

      // Ordenar por fecha de entrega más reciente
      allDeliverables.sort((a, b) => new Date(b.fecha_entrega) - new Date(a.fecha_entrega));

      // Calcular estadísticas
      const stats = {
        total: allDeliverables.length,
        pendientes: allDeliverables.filter(d => d.estado === 'pendiente').length,
        aprobados: allDeliverables.filter(d => d.estado === 'aprobado').length,
        rechazados: allDeliverables.filter(d => d.estado === 'rechazado').length
      };

      // Paginación
      const totalDeliverables = allDeliverables.length;
      const paginatedDeliverables = allDeliverables.slice(offset, offset + limit);
      const totalPages = Math.ceil(totalDeliverables / limit);

      res.render('director/deliverables', {
        title: 'Entregables de Proyectos Dirigidos',
        user,
        deliverables: paginatedDeliverables,
        projects: directedProjects,
        stats,
        currentPage: parseInt(page),
        totalPages,
        estado,
        proyecto,
        search,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error loading director deliverables:', error);
      req.flash('error', 'Error al cargar los entregables');
      res.redirect('/dashboard/director');
    }
  }


  // ===== MÉTODOS DE APOYO =====

  // Obtener proyecto por ID (verificando que sea dirigido por este director)
  async getProjectById(projectId, directorId) {
    try {
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      const project = projects[0];
      
      if (!project || project.director_id !== directorId) {
        return null;
      }
      
      return project;
    } catch (error) {
      console.error('Error getting project by ID:', error);
      throw error;
    }
  }

  // Obtener entregables por proyecto
  async getDeliverablesByProject(projectId) {
    try {
      return await this.entregableModel.findByProject(projectId);
    } catch (error) {
      console.error('Error getting deliverables by project:', error);
      throw error;
    }
  }


}

module.exports = DirectorController;