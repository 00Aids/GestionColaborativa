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

      // Usar el modelo centralizado para obtener proyectos dirigidos
      const additionalConditions = {};
      if (estado) additionalConditions.estado = estado;
      const directedProjects = await this.projectModel.findByDirector(user.id, additionalConditions);

      // Aplicar búsqueda por título si se especifica
      let filteredProjects = directedProjects;
      if (search) {
        const term = String(search).toLowerCase();
        filteredProjects = directedProjects.filter(project => 
          ((project.titulo || '')).toLowerCase().includes(term)
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
      
      if (!project) {
        return null;
      }
      
      // Verificar si el director es el director asignado O es miembro con rol de director
      const isAssignedDirector = project.director_id === directorId;
      if (isAssignedDirector) {
        return project;
      }
      
      // Verificar si es miembro con rol de director
      const isProjectMember = await this.projectModel.findProjectMember(projectId, directorId);
      if (isProjectMember && isProjectMember.rol_en_proyecto === 'director') {
        return project;
      }
      
      return null;
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

  // ===== ASIGNACIÓN DE ENTREGABLES =====

  // Crear nuevo entregable
  async createDeliverable(req, res) {
    try {
      const { projectId } = req.params;
      const director = req.session.user;
      // Con multipart/form-data (multer), los campos vienen como strings
      const { 
        titulo, 
        descripcion, 
        fecha_entrega, // utilizado desde el formulario como fecha límite
        fase_id,
        asignado_a,
        estimacion_horas,
        estado,
        etiquetas
      } = req.body;

      // Verificar que el director tiene acceso al proyecto
      const hasAccess = await this.getProjectById(projectId, director.id);
      if (!hasAccess) {
        return res.status(403).json({ 
          success: false,
          error: 'No tienes acceso a este proyecto' 
        });
      }

      // Validaciones
      if (!titulo || !fecha_entrega) {
        return res.status(400).json({ 
          success: false,
          error: 'El título y la fecha de entrega son obligatorios' 
        });
      }

      // Validar que la fecha límite sea futura
      const dueDate = new Date(fecha_entrega);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Resetear horas para comparar solo fechas
      
      if (dueDate <= today) {
        return res.status(400).json({ 
          success: false,
          error: 'La fecha de entrega debe ser posterior a hoy' 
        });
      }

      // Crear el entregable
      const deliverableData = {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        proyecto_id: projectId,
        fase_id: fase_id ? Number(fase_id) : 1, // Por defecto fase 1 (Propuesta)
        fecha_limite: fecha_entrega, // mapear como fecha límite del entregable
        estado: (estado && estado.trim()) || 'pendiente'
      };

      // Campos opcionales adicionales
      if (asignado_a) {
        const asignado = Number(asignado_a);
        if (!Number.isNaN(asignado)) {
          // Validar que el usuario asignado sea miembro del proyecto y Estudiante
          const member = await this.projectModel.findProjectMember(projectId, asignado);
          if (!member) {
            return res.status(400).json({
              success: false,
              error: 'El usuario seleccionado no pertenece al proyecto'
            });
          }
          if ((member.rol_nombre || '').trim() !== 'Estudiante') {
            return res.status(400).json({
              success: false,
              error: 'Solo se puede asignar el entregable a un usuario con rol Estudiante'
            });
          }
          deliverableData.asignado_a = asignado;
        }
      }
      if (estimacion_horas) {
        const est = Number(estimacion_horas);
        if (!Number.isNaN(est)) {
          deliverableData.estimacion_horas = est;
        }
      }
      if (etiquetas) {
        deliverableData.etiquetas = etiquetas;
      }

      // Procesar archivos adjuntos (archivos de referencia) enviados por el director
      let attachments = [];
      if (req.files && req.files.length > 0) {
        const FileHelper = require('../helpers/fileHelper');
        attachments = FileHelper.processUploadedFiles(req.files, '/uploads/deliverables');
      }
      if (attachments.length > 0) {
        deliverableData.observaciones = JSON.stringify({ archivos_adjuntos: attachments });
      }

      const newDeliverable = await this.entregableModel.create(deliverableData);

      res.json({
        success: true,
        message: 'Entregable creado exitosamente',
        deliverable: newDeliverable
      });

    } catch (error) {
      console.error('Error creating deliverable:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error interno del servidor' 
      });
    }
  }

  // Asignar entregable a usuario específico
  async assignDeliverableToUser(req, res) {
    try {
      const { deliverableId } = req.params;
      const { userId } = req.body;
      const director = req.session.user;

      // Verificar que el entregable existe y obtener información del proyecto
      const deliverable = await this.entregableModel.findByIdWithDetails(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar que el director tiene permisos sobre el proyecto
      const hasAccess = await this.getProjectById(deliverable.proyecto_id, director.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para asignar entregables de este proyecto'
        });
      }

      // Verificar que el usuario a asignar existe
      const targetUser = await this.userModel.findById(userId);
      if (!targetUser) {
        return res.status(404).json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      // Validar que el usuario sea estudiante miembro del proyecto
      const member = await this.projectModel.findProjectMember(deliverable.proyecto_id, userId);
      if (!member) {
        return res.status(400).json({
          success: false,
          message: 'El usuario no pertenece a este proyecto'
        });
      }
      if ((member.rol_nombre || '').trim() !== 'Estudiante') {
        return res.status(400).json({
          success: false,
          message: 'Solo se puede asignar el entregable a un usuario con rol Estudiante'
        });
      }

      // Realizar la asignación
      const assigned = await this.entregableModel.assignToUser(deliverableId, userId, director.id);
      
      if (assigned) {
        res.json({
          success: true,
          message: `Entregable asignado exitosamente a ${targetUser.nombres} ${targetUser.apellidos}`
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Error al asignar el entregable'
        });
      }

    } catch (error) {
      console.error('Error assigning deliverable to user:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Asignar entregable a todos los usuarios de un rol específico
  async assignDeliverableToRole(req, res) {
    try {
      const { deliverableId } = req.params;
      const { roleId } = req.body;
      const director = req.session.user;

      // Verificar que el entregable existe y obtener información del proyecto
      const deliverable = await this.entregableModel.findByIdWithDetails(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar que el director tiene permisos sobre el proyecto
      const hasAccess = await this.getProjectById(deliverable.proyecto_id, director.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para asignar entregables de este proyecto'
        });
      }

      // Realizar la asignación por rol
      const assignments = await this.entregableModel.assignToRole(deliverableId, roleId, director.id);
      
      res.json({
        success: true,
        message: `Entregable asignado exitosamente a ${assignments.length} usuarios`,
        assignments: assignments
      });

    } catch (error) {
      console.error('Error assigning deliverable to role:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener usuarios disponibles para asignación en un proyecto
  async getAvailableUsersForAssignment(req, res) {
    try {
      const { projectId } = req.params;
      const director = req.session.user;

      // Verificar que el director tiene permisos sobre el proyecto
      const hasAccess = await this.getProjectById(projectId, director.id);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este proyecto'
        });
      }

      // Obtener miembros del proyecto y filtrar solo estudiantes
      const projectMembers = await this.projectModel.getProjectMembers(projectId);
      const students = (projectMembers || [])
        .filter(m => (m.rol_nombre || '').trim() === 'Estudiante')
        .map(m => ({
          id: m.usuario_id || m.id,
          nombres: m.nombres,
          apellidos: m.apellidos,
          email: m.email,
          rol: m.rol_nombre,
          codigo_usuario: m.codigo_usuario
        }));

      res.json({
        success: true,
        users: students
      });

    } catch (error) {
      console.error('Error getting available users for assignment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener todos los usuarios disponibles (sin requerir proyecto específico)
  async getAllAvailableUsers(req, res) {
    try {
      // Obtener todos los usuarios activos
      const allUsers = await this.userModel.findAll({ activo: 1 });

      res.json({
        success: true,
        users: allUsers || []
      });

    } catch (error) {
      console.error('Error getting all available users:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }


}

module.exports = DirectorController;