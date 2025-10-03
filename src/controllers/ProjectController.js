const nodemailer = require('nodemailer');

class ProjectController {
  constructor(projectModel, userModel, entregableModel, evaluationModel) {
    const Project = require('../models/Project');
    const User = require('../models/User');
    const Entregable = require('../models/Entregable');
    const Evaluation = require('../models/Evaluation');
    this.projectModel = projectModel || new Project();
    this.userModel = userModel || new User();
    this.entregableModel = entregableModel || new Entregable();
    this.evaluationModel = evaluationModel || new Evaluation();
  }

  // Vista index de proyectos (alias de list)
  async index(req, res) { return this.list(req, res); }

  async list(req, res) {
    try {
      const user = req.session?.user;
      if (!user) {
        req.flash('error', 'Sesión inválida');
        return res.redirect('/login');
      }

      const { page, search, searchParticipants, estado, fechaInicio, fechaFin, director, estudiante, sortBy, sortOrder, limit } = req.query;

      // Construir condiciones seguras (evitar undefined)
      const conditions = {};
      if (estudiante) conditions.estudiante_id = parseInt(estudiante, 10);
      if (director) conditions.director_id = parseInt(director, 10);
      if (estado) conditions.estado = estado;
      if (fechaInicio) conditions.fecha_inicio_desde = fechaInicio;
      if (fechaFin) conditions.fecha_fin_hasta = fechaFin;

      // Obtener proyectos con condiciones
      let projects = await this.projectModel.findWithDetails(conditions);

      // Filtrar proyectos según el rol del usuario
      if (user.rol_nombre === 'Estudiante') {
        projects = projects.filter(project => project.estudiante_id === user.id);
      } else if (user.rol_nombre === 'Director de Proyecto') {
        projects = projects.filter(project => project.director_id === user.id);
      }

      // Filtro de búsqueda por título/descripcion
      if (search && String(search).trim().length > 0) {
        const term = String(search).toLowerCase();
        projects = projects.filter(p => (p.titulo || '').toLowerCase().includes(term) || (p.descripcion || '').toLowerCase().includes(term));
      }

      // Filtro de búsqueda por participantes
      if (searchParticipants && String(searchParticipants).trim().length > 0) {
        const term = String(searchParticipants).toLowerCase();
        projects = projects.filter(p => (p.estudiante_nombre || '').toLowerCase().includes(term) || (p.director_nombre || '').toLowerCase().includes(term));
      }

      // Ordenamiento
      const sortKey = sortBy || 'created_at';
      const order = (sortOrder === 'asc' || sortOrder === 'desc') ? sortOrder : 'desc';
      projects.sort((a, b) => {
        let aValue, bValue;
        switch (sortKey) {
          case 'titulo':
            aValue = a.titulo?.toLowerCase() || '';
            bValue = b.titulo?.toLowerCase() || '';
            break;
          case 'estado':
            aValue = a.estado || '';
            bValue = b.estado || '';
            break;
          case 'estudiante':
            aValue = a.estudiante_nombre?.toLowerCase() || '';
            bValue = b.estudiante_nombre?.toLowerCase() || '';
            break;
          case 'director':
            aValue = a.director_nombre?.toLowerCase() || '';
            bValue = b.director_nombre?.toLowerCase() || '';
            break;
          case 'fecha_inicio':
            aValue = new Date(a.fecha_inicio || 0).getTime();
            bValue = new Date(b.fecha_inicio || 0).getTime();
            break;
          case 'created_at':
          default:
            aValue = new Date(a.created_at || 0).getTime();
            bValue = new Date(b.created_at || 0).getTime();
            break;
        }
        if (aValue < bValue) return order === 'asc' ? -1 : 1;
        if (aValue > bValue) return order === 'asc' ? 1 : -1;
        return 0;
      });

      // Calcular progreso para cada proyecto
      for (let project of projects) {
        project.progress = await this.calculateProjectProgress(project.id);
      }

      // Paginación
      const perPage = parseInt(limit, 10) || 10;
      const currentPage = parseInt(page, 10) || 1;
      const offset = (currentPage - 1) * perPage;
      const totalProjects = projects.length;
      const paginatedProjects = projects.slice(offset, offset + perPage);
      const totalPages = Math.ceil(totalProjects / perPage);

      // Obtener listas para filtros y estadísticas
      const [directors, students] = await Promise.all([
        this.userModel.findByRole('Director de Proyecto'),
        this.userModel.findByRole('Estudiante')
      ]);
      const stats = await this.getProjectStats(projects, user);

      res.render('projects/index', {
        title: 'Proyectos',
        user,
        projects: paginatedProjects,
        currentPage,
        totalPages,
        search,
        searchParticipants,
        estado,
        fechaInicio,
        fechaFin,
        dateFrom: fechaInicio,
        dateTo: fechaFin,
        director,
        estudiante,
        sortBy: sortKey,
        sortOrder: order,
        stats,
        directors: directors || [],
        students: students || [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error listing projects:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Método auxiliar para obtener estadísticas
  async getProjectStats(projects, user) {
    const stats = {
      total: projects.length,
      activos: projects.filter(p => p.estado === 'activo').length,
      completados: projects.filter(p => p.estado === 'finalizado').length,
      pendientes: projects.filter(p => p.estado === 'borrador').length
    };
    
    return stats;
  }

  // Mostrar formulario de creación
  async showCreate(req, res) {
    try {
      const user = req.session.user;
      
      // Solo Coordinadores, Administradores y Directores pueden crear proyectos
      if (!['Coordinador Académico', 'Administrador General', 'Director de Proyecto'].includes(user.rol_nombre)) {
        req.flash('error', 'No tienes permisos para crear proyectos');
        return res.redirect('/projects');
      }
      
      // Obtener datos necesarios para el formulario
      const [directors, students, coordinators, evaluators, lineasResult, ciclosResult, administradoresResult] = await Promise.all([
        this.userModel.findByRole('Director de Proyecto'),
        this.userModel.findByRole('Estudiante'),
        this.userModel.findByRole('Coordinador Académico'),
        this.userModel.findByRole('Evaluador'),
        this.userModel.query('SELECT * FROM lineas_investigacion WHERE activo = 1'),
        this.userModel.query('SELECT * FROM ciclos_academicos WHERE activo = 1'),
        this.userModel.query(`
          SELECT u.id, u.nombres, u.apellidos, u.area_trabajo_id, at.nombre as area_nombre
          FROM usuarios u
          LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
          WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador General')
          AND u.activo = 1
          ORDER BY u.nombres, u.apellidos
        `)
      ]);
      
      res.render('projects/create', {
        title: 'Crear Proyecto',
        user,
        directors: directors || [],
        students: students || [],
        coordinators: coordinators || [],
        evaluators: evaluators || [],
        administradores: administradoresResult || [],
        lineasInvestigacion: lineasResult || [],
        ciclosAcademicos: ciclosResult || [],
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
        fecha_inicio,
        fecha_fin,
        director_id,
        administrador_id,
        linea_investigacion_id,
        ciclo_academico_id,
        generate_invitation,
        max_uses,
        expires_in_days
      } = req.body;
      
      // Validaciones básicas
      if (!titulo || !descripcion || !objetivos || !director_id || !administrador_id || !fecha_inicio || !fecha_fin) {
        req.flash('error', 'Los campos Título, Descripción, Objetivos, Director, Administrador, Fecha de Inicio y Fecha de Fin son obligatorios');
        return res.redirect('/projects/create');
      }
      
      // Validar que el título no esté vacío después de trim
      if (titulo.trim().length === 0) {
        req.flash('error', 'El título del proyecto no puede estar vacío');
        return res.redirect('/projects/create');
      }
      
      // Validar fechas
      if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
        req.flash('error', 'La fecha de fin debe ser posterior a la fecha de inicio');
        return res.redirect('/projects/create');
      }
      
      const adminRows = await this.userModel.query(
        'SELECT area_trabajo_id FROM usuarios WHERE id = ? AND rol_id = (SELECT id FROM roles WHERE nombre = "Administrador General")',
        [parseInt(administrador_id)]
      );
      
      if (!adminRows || adminRows.length === 0) {
        req.flash('error', 'El administrador seleccionado no es válido');
        return res.redirect('/projects/create');
      }
      
      const adminAreaTrabajoId = adminRows[0].area_trabajo_id;
      if (!adminAreaTrabajoId) {
        req.flash('error', 'El administrador seleccionado no tiene un área de trabajo asignada');
        return res.redirect('/projects/create');
      }
      
      const projectData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        objetivos: objetivos.trim(),
        fecha_inicio,
        fecha_fin,
        estudiante_id: null, // No asignar estudiante automáticamente
        director_id: parseInt(director_id),
        linea_investigacion_id: linea_investigacion_id ? parseInt(linea_investigacion_id) : null,
        ciclo_academico_id: ciclo_academico_id ? parseInt(ciclo_academico_id) : null,
        area_trabajo_id: adminAreaTrabajoId, // Asignar área de trabajo del administrador seleccionado
        estado: 'borrador'
      };
      
      const project = await this.projectModel.create(projectData);
      
      // Generar código de invitación si se solicitó
      if (generate_invitation === 'on') {
        const invitationOptions = {
          maxUsos: max_uses ? parseInt(max_uses) : 1,
          fechaExpiracion: expires_in_days ? new Date(Date.now() + parseInt(expires_in_days) * 24 * 60 * 60 * 1000) : null
        };
        
        const invitation = await this.projectModel.createInvitation(project.id, user.id, invitationOptions);
        req.flash('success', `Proyecto creado exitosamente y asignado al área de trabajo del administrador seleccionado. Código de invitación: ${invitation.codigo}`);
      } else {
        req.flash('success', 'Proyecto creado exitosamente y asignado al área de trabajo del administrador seleccionado');
      }
      
      res.redirect('/projects');
      
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
        const redirectUrl = user.rol_nombre === 'Estudiante' ? '/student/projects' : '/projects';
        return res.redirect(redirectUrl);
      }
      
      // Verificar permisos según el rol del usuario
      if (user.rol_nombre === 'Estudiante') {
        // Los estudiantes pueden ver proyectos donde sean el estudiante principal O sean miembros del proyecto
        const isMainStudent = project.estudiante_id === user.id;
        const isProjectMember = await this.projectModel.findProjectMember(projectId, user.id);
        
        // Debug logs
        console.log('=== DEBUG PERMISSION CHECK ===');
        console.log('User ID:', user.id);
        console.log('Project ID:', projectId);
        console.log('Project area_trabajo_id:', project.area_trabajo_id);
        console.log('User area_trabajo_id (req.areaTrabajoId):', req.areaTrabajoId);
        console.log('Project estudiante_id:', project.estudiante_id);
        console.log('Is main student:', isMainStudent);
        console.log('Is project member:', !!isProjectMember);
        console.log('Project member data:', isProjectMember);
        console.log('==============================');
        
        // Si el usuario es miembro del proyecto o es el estudiante principal, puede acceder
        if (!isMainStudent && !isProjectMember) {
          req.flash('error', 'No tienes permisos para ver este proyecto');
          return res.redirect('/student/projects');
        }
        
        // Si no es miembro pero el área de trabajo no coincide, también denegar acceso
        if (!isProjectMember && project.area_trabajo_id !== req.areaTrabajoId) {
          req.flash('error', 'No tienes permisos para ver este proyecto');
          return res.redirect('/student/projects');
        }
      } else if (user.rol_nombre === 'Director de Proyecto') {
        // Los directores pueden ver cualquier proyecto donde sean directores, independientemente del área
        if (project.director_id !== user.id) {
          req.flash('error', 'No tienes permisos para ver este proyecto');
          return res.redirect('/projects');
        }
      } else if (user.rol_nombre === 'Coordinador Académico') {
        // Los coordinadores pueden ver proyectos donde estén asignados como miembros activos
        // o pertenezcan a cualquiera de sus áreas de trabajo
        const isProjectMember = await this.projectModel.findProjectMember(projectId, user.id);
        const hasAreaAccess = Array.isArray(req.userAreas) && req.userAreas.some(a => a.area_trabajo_id === project.area_trabajo_id);
        if (!isProjectMember && !hasAreaAccess) {
          req.flash('error', 'No tienes permisos para ver este proyecto');
          return res.redirect('/coordinator/projects');
        }
      } else if (user.rol_nombre === 'Administrador General') {
        // Los administradores generales pueden ver cualquier proyecto
        // No se aplica restricción por área ni membresía
      } else {
        // Para otros roles, verificar que el proyecto pertenezca al área de trabajo del usuario
        if (project.area_trabajo_id !== req.areaTrabajoId) {
          req.flash('error', 'No tienes permisos para ver este proyecto');
          return res.redirect('/projects');
        }
      }
      
      // Obtener entregables y evaluaciones
      const deliverables = await this.entregableModel.findByProject(projectId);
      const evaluations = await this.evaluationModel.findByProject(projectId);
      
      // Obtener datos adicionales para las nuevas pestañas
      const members = await this.projectModel.getProjectMembers(projectId);
      const invitations = await this.projectModel.getProjectInvitations(projectId);
      const tasks = await this.projectModel.getProjectTasks(projectId);
      
      res.render('projects/show', {
        title: `Proyecto: ${project.titulo}`,
        user,
        project,
        deliverables,
        evaluations,
        members,
        invitations,
        tasks,
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

  // Mostrar formulario para unirse con código de invitación
  async showJoinForm(req, res) {
    try {
      const user = req.session.user;
      
      // Cualquier usuario autenticado puede unirse a proyectos usando códigos
      res.render('projects/join', {
        title: 'Unirse a Proyecto',
        user
      });
      
    } catch (error) {
      console.error('Error showing join form:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Procesar unión al proyecto con código
  async joinWithCode(req, res) {
    try {
      const user = req.session.user;
      const { invitation_code } = req.body;
      
      if (!invitation_code || invitation_code.trim().length === 0) {
        req.flash('error', 'El código de invitación es obligatorio');
        return res.redirect('/projects/join');
      }
      
      // Validar y procesar la invitación
      const result = await this.projectModel.joinProjectWithCode(invitation_code.trim(), user.id);
      
      if (result.success) {
        // Asegurar que el usuario tenga asignada el área de trabajo del proyecto
        const project = await this.projectModel.findById(result.project.id);
        if (project && project.area_trabajo_id) {
          const alreadyInArea = await this.userModel.belongsToArea(user.id, project.area_trabajo_id);
          if (!alreadyInArea) {
            await this.userModel.assignToArea(user.id, project.area_trabajo_id, false, false);
          }
          // Sincronizar área primaria si está vacía
          await this.userModel.setPrimaryAreaIfEmpty(user.id, project.area_trabajo_id);
        }
        
        req.flash('success', `Te has unido exitosamente al proyecto: ${result.project.titulo}`);
        res.redirect(`/projects/${result.project.id}`);
      } else {
        req.flash('error', result.message);
        res.redirect('/projects/join');
      }
      
    } catch (error) {
      console.error('Error joining project with code:', error);
      req.flash('error', 'Error al unirse al proyecto: ' + error.message);
      res.redirect('/projects/join');
    }
  }

  // Mostrar invitaciones del proyecto
  async showInvitations(req, res) {
    try {
      const user = req.session.user;
      const { id } = req.params;
      
      // Verificar que el usuario tenga permisos para ver las invitaciones
      const project = await this.projectModel.findById(id);
      if (!project) {
        req.flash('error', 'Proyecto no encontrado');
        return res.redirect('/projects');
      }
      
      // Solo el creador del proyecto o coordinadores pueden ver invitaciones
      if (project.estudiante_id !== user.id && !['Coordinador Académico', 'Administrador General'].includes(user.rol_nombre)) {
        req.flash('error', 'No tienes permisos para ver las invitaciones de este proyecto');
        return res.redirect(`/projects/${id}`);
      }
      
      const invitations = await this.projectModel.getProjectInvitations(id);
      const members = await this.projectModel.getProjectMembers(id);
      
      res.render('projects/invitations', {
        title: 'Gestionar Invitaciones',
        user,
        project,
        invitations,
        members
      });
      
    } catch (error) {
      console.error('Error showing invitations:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Desactivar código de invitación
  async deactivateInvitation(req, res) {
    try {
      const { projectId, invitationId } = req.params;
      const user = req.session.user;
      
      // Verificar permisos
      if (user.rol_nombre !== 'Administrador General' && user.rol_nombre !== 'Coordinador Académico') {
        const project = await this.projectModel.findById(projectId);
        if (project.estudiante_id !== user.id) {
          req.flash('error', 'No tienes permisos para gestionar invitaciones de este proyecto');
          return res.redirect(`/projects/${projectId}`);
        }
      }
      
      await this.projectModel.deactivateInvitation(invitationId);
      
      // Responder con JSON para peticiones AJAX
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.json({ success: true, message: 'Invitación cancelada correctamente' });
      }
      
      req.flash('success', 'Invitación desactivada correctamente');
      res.redirect(`/projects/${projectId}/invitations`);
    } catch (error) {
      console.error('Error deactivating invitation:', error);
      
      // Responder con JSON para peticiones AJAX
      if (req.headers.accept && req.headers.accept.includes('application/json')) {
        return res.status(500).json({ success: false, error: 'Error al cancelar la invitación' });
      }
      
      req.flash('error', 'Error al desactivar la invitación');
      res.redirect(`/projects/${req.params.projectId}/invitations`);
    }
  }

  // Crear invitación
  async createInvitation(req, res) {
      try {
          const { id: projectId } = req.params;
          const { email, mensaje, max_uses, expires_in_days } = req.body;
          const invitadoPor = req.session.user.id;
  
          // Verificar que el usuario tenga permisos en el proyecto
          const project = await this.projectModel.findById(projectId);
          if (!project) {
              return res.status(404).json({ error: 'Proyecto no encontrado' });
          }
  
          // Crear la invitación
          const invitation = new Invitation();
          const invitationData = {
              proyecto_id: parseInt(projectId),
              email: email || null,
              invitado_por: invitadoPor,
              mensaje: mensaje || null
          };
  
          // Si se especifica expiración personalizada
          if (expires_in_days) {
              const expirationDate = new Date();
              expirationDate.setDate(expirationDate.getDate() + parseInt(expires_in_days));
              invitationData.fecha_expiracion = expirationDate;
          }
  
          const newInvitation = await invitation.create(invitationData);
  
          // Enviar email de invitación si se proporcionó email
          if (email) {
              try {
                  await this.sendInvitationEmail(email, newInvitation.codigo_invitacion, project.titulo, mensaje);
              } catch (emailError) {
                  console.error('Error sending email:', emailError);
                  // No fallar la creación de invitación si el email falla
              }
          }
  
          res.json({
              success: true,
              invitation: newInvitation,
              message: 'Invitación creada exitosamente'
          });
      } catch (error) {
          console.error('Error creating invitation:', error);
          res.status(500).json({ 
              success: false,
              error: 'Error interno del servidor: ' + error.message 
          });
      }
  }
  
  // Obtener invitaciones de un proyecto
  async getProjectInvitations(req, res) {
      try {
          const { id: projectId } = req.params;
          const invitation = new Invitation();
          
          const invitations = await invitation.findByProject(projectId);
          const stats = await invitation.getStats(projectId);
  
          res.json({
              success: true,
              invitations,
              stats
          });
      } catch (error) {
          console.error('Error getting project invitations:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
      }
  }
  
  // Mostrar página de aceptación de invitación
  async showAcceptInvitation(req, res) {
    try {
      const { codigo } = req.params;
      
      const invitation = new Invitation();
      const invitationData = await invitation.findByCode(codigo);
      
      if (!invitationData) {
        req.flash('error', 'Invitación no encontrada o expirada');
        return res.redirect('/auth/login');
      }

      // Verificar si la invitación ya fue usada o expiró
      if (invitationData.estado !== 'pendiente') {
        return res.render('errors/invitation-consumed', {
          title: 'Invitación ya utilizada',
          message: 'Esta invitación ya fue procesada anteriormente'
        });
      }

      // Obtener información del proyecto
      const project = await this.projectModel.findById(invitationData.proyecto_id);
      
      if (!project) {
        req.flash('error', 'Proyecto no encontrado');
        return res.redirect('/auth/login');
      }

      // Si el usuario no está autenticado, mostrar opciones de registro/login
      if (!req.session.user) {
        return res.render('projects/invitation-options', {
          title: 'Únete al Proyecto',
          invitation: invitationData,
          project: project,
          codigo: codigo
        });
      }

      // Si el usuario está autenticado, mostrar la página de aceptación normal
      res.render('projects/accept-invitation', {
        title: 'Aceptar Invitación',
        invitation: invitationData,
        project: project,
        codigo: codigo,
        user: req.session.user
      });
      
    } catch (error) {
      console.error('Error showing accept invitation page:', error);
      req.flash('error', 'Error al cargar la página de invitación');
      res.redirect('/auth/login');
    }
  }

  // Aceptar invitación
  async acceptInvitation(req, res) {
      try {
          const { codigo } = req.params;
          const userId = req.session.user.id; // Cambiar de req.user.id
          
          const invitation = new Invitation();
          const invitationData = await invitation.findByCode(codigo);
          
          if (!invitationData) {
              return res.status(404).json({ error: 'Invitación no encontrada o expirada' });
          }

          // Obtener información del proyecto para asignar el área de trabajo correcta
          const project = await this.projectModel.findById(invitationData.proyecto_id);
          if (!project) {
              return res.status(404).json({ error: 'Proyecto no encontrado' });
          }

          // Asegurar que el usuario esté en el área de trabajo del proyecto
          const User = require('../models/User');
          const userModel = new User();
          const userBelongsToArea = await userModel.belongsToArea(userId, project.area_trabajo_id);
          
          if (!userBelongsToArea) {
              await userModel.assignToArea(userId, project.area_trabajo_id, false, false);
              console.log(`Usuario ${userId} agregado al área de trabajo ${project.area_trabajo_id}`);
          }
          // Sincronizar área primaria si está vacía
          await userModel.setPrimaryAreaIfEmpty(userId, project.area_trabajo_id);

          // Aceptar la invitación
          await invitation.accept(invitationData.id, userId);

          // Agregar usuario al proyecto
          await this.addUserToProject(invitationData.proyecto_id, userId);

          // Establecer mensaje flash de éxito
          req.flash('success', `Te has unido exitosamente al proyecto "${invitationData.proyecto_nombre}"`);
          
          // Redirigir al dashboard
          res.redirect(DashboardHelper.getDashboardRouteFromUser(req.session.user));
      } catch (error) {
          console.error('Error accepting invitation:', error);
          res.status(500).json({ error: error.message });
      }
  }
  
  // Rechazar invitación
  async rejectInvitation(req, res) {
      try {
          const { codigo } = req.params;
          
          const invitation = new Invitation();
          const invitationData = await invitation.findByCode(codigo);
          
          if (!invitationData) {
              return res.status(404).json({ error: 'Invitación no encontrada' });
          }

          await invitation.reject(invitationData.id);

          // Establecer mensaje flash de información
          req.flash('info', 'Has rechazado la invitación al proyecto');

          // Redirigir al dashboard  
          res.redirect(DashboardHelper.getDashboardRouteFromUser(req.session.user));
      } catch (error) {
          console.error('Error rejecting invitation:', error);
          res.status(500).json({ error: 'Error interno del servidor' });
      }
  }
  
  // Enviar email de invitación
  async sendInvitationEmail(email, codigo, projectName, mensaje) {
      try {
          // Configurar transporter de nodemailer
          const transporter = nodemailer.createTransporter({
              // Configurar según tu proveedor de email
              host: process.env.SMTP_HOST,
              port: process.env.SMTP_PORT,
              secure: false,
              auth: {
                  user: process.env.SMTP_USER,
                  pass: process.env.SMTP_PASS
              }
          });

          const invitationUrl = `${process.env.APP_URL}/projects/invitations/accept/${codigo}`;
          
          const mailOptions = {
              from: process.env.SMTP_FROM,
              to: email,
              subject: `Invitación al proyecto: ${projectName}`,
              html: `
                  <h2>Invitación al Proyecto</h2>
                  <p>Has sido invitado a participar en el proyecto: <strong>${projectName}</strong></p>
                  ${mensaje ? `<p>Mensaje: ${mensaje}</p>` : ''}
                  <p>Para aceptar la invitación, haz clic en el siguiente enlace:</p>
                  <a href="${invitationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Aceptar Invitación</a>
                  <p>O copia y pega este código: <strong>${codigo}</strong></p>
                  <p>Esta invitación expira en 7 días.</p>
              `
          };

          await transporter.sendMail(mailOptions);
      } catch (error) {
          console.error('Error sending invitation email:', error);
          throw error;
      }
  }
  
  // Agregar usuario al proyecto
  async addUserToProject(projectId, userId) {
      try {
          // Verificar si el usuario ya está en el proyecto
          const query = 'SELECT * FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ?';
          const existing = await this.projectModel.query(query, [projectId, userId]);
          
          if (existing.length === 0) {
              // Obtener información del proyecto para conseguir el area_trabajo_id
              const project = await this.projectModel.findById(projectId);
              
              // Asignar automáticamente el usuario al área de trabajo del proyecto
              if (project && project.area_trabajo_id) {
                  const User = require('../models/User');
                  const userModel = new User();
                  
                  try {
                      // Verificar si el usuario ya pertenece al área de trabajo
                      const belongsToArea = await userModel.belongsToArea(userId, project.area_trabajo_id);
                      if (!belongsToArea) {
                          await userModel.assignToArea(userId, project.area_trabajo_id, false, false);
                      }
                  } catch (areaError) {
                      // Si hay error asignando al área, no fallar todo el proceso
                      console.warn(`Warning: Could not assign user ${userId} to area ${project.area_trabajo_id}: ${areaError.message}`);
                  }
              }
              
              // Agregar usuario al proyecto con rol por defecto
              const insertQuery = 'INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion) VALUES (?, ?, ?, NOW())';
              await this.projectModel.query(insertQuery, [projectId, userId, 'estudiante']);
          }
      } catch (error) {
          throw new Error(`Error adding user to project: ${error.message}`);
      }
  }
  
  // Generar código de invitación rápido
  // Actualizar el método generateQuickInvitation (línea ~597)
  async generateQuickInvitation(req, res) {
      try {
          const { id: projectId } = req.params;
          const { max_uses, expires_in_days } = req.body;
          const invitadoPor = req.session.user.id;
  
          // Verificar que el usuario tenga permisos en el proyecto
          const project = await this.projectModel.findById(projectId);
          if (!project) {
              return res.status(404).json({ error: 'Proyecto no encontrado' });
          }
  
          const invitation = new Invitation();
          const invitationData = {
              proyecto_id: parseInt(projectId),
              invitado_por: invitadoPor,
              max_usos: max_uses ? parseInt(max_uses) : 1
          };
  
          // Si se especifica expiración personalizada
          if (expires_in_days) {
              const expirationDate = new Date();
              expirationDate.setDate(expirationDate.getDate() + parseInt(expires_in_days));
              invitationData.fecha_expiracion = expirationDate;
          }
  
          const newInvitation = await invitation.create(invitationData);
  
          res.json({
              success: true,
              codigo: newInvitation.codigo_invitacion,
              url: `${process.env.APP_URL || 'http://localhost:3000'}/projects/invitations/accept/${newInvitation.codigo_invitacion}`,
              message: 'Código de invitación generado exitosamente',
              expires_in_days: expires_in_days || 7
          });
      } catch (error) {
          console.error('Error generating quick invitation:', error);
          res.status(500).json({ 
              success: false,
              error: 'Error interno del servidor: ' + error.message 
          });
      }
  }

  // Enviar invitación por email
  async sendEmailInvitation(req, res) {
      try {
          const { id: projectId } = req.params;
          const { email, message, expires_in_days } = req.body;
          const invitadoPor = req.session.user.id;

          // Validar email
          if (!email || !email.includes('@')) {
              return res.status(400).json({ 
                  success: false,
                  error: 'Email válido es requerido' 
              });
          }

          // Verificar que el usuario tenga permisos en el proyecto
          const project = await this.projectModel.findById(projectId);
          if (!project) {
              return res.status(404).json({ 
                  success: false,
                  error: 'Proyecto no encontrado' 
              });
          }

          // Verificar si ya existe una invitación pendiente para este email
          const invitation = new Invitation();
          const existingInvitation = await invitation.findByEmailAndProject(email, projectId);
          
          if (existingInvitation && existingInvitation.estado === 'pendiente') {
              return res.status(400).json({ 
                  success: false,
                  error: 'Ya existe una invitación pendiente para este email' 
              });
          }

          // Crear nueva invitación
          const invitationData = {
              proyecto_id: parseInt(projectId),
              email: email,
              invitado_por: invitadoPor,
              mensaje: message || null,
              max_usos: 1 // Las invitaciones por email son de un solo uso
          };

          // Configurar fecha de expiración
          if (expires_in_days) {
              const expirationDate = new Date();
              expirationDate.setDate(expirationDate.getDate() + parseInt(expires_in_days));
              invitationData.fecha_expiracion = expirationDate;
          }

          const newInvitation = await invitation.create(invitationData);

          // Obtener información del usuario que invita
          const userModel = new User();
          const inviter = await userModel.findById(invitadoPor);
          const inviterName = `${inviter.nombres} ${inviter.apellidos}`;

          // Enviar email usando el servicio de email
          const EmailService = require('../services/EmailService');
          const emailService = new EmailService();
          
          await emailService.sendInvitation({
              email: email,
              projectName: project.titulo,
              inviterName: inviterName,
              invitationCode: newInvitation.codigo_invitacion,
              message: message
          });

          res.json({
              success: true,
              message: 'Invitación enviada exitosamente por email',
              invitation_id: newInvitation.id,
              codigo: newInvitation.codigo_invitacion
          });

      } catch (error) {
          console.error('Error sending email invitation:', error);
          res.status(500).json({ 
              success: false,
              error: 'Error interno del servidor: ' + error.message 
          });
      }
  }

  // Procesar registro desde invitación
  async registerFromInvitation(req, res) {
    try {
      const { codigo } = req.params;
      const { nombres, apellidos, email, password, confirm_password } = req.body;

      // Validar que las contraseñas coincidan
      if (password !== confirm_password) {
        req.flash('error', 'Las contraseñas no coinciden');
        return res.redirect(`/projects/invitations/accept/${codigo}`);
      }

      // Verificar que la invitación existe y está pendiente
      const invitation = new Invitation();
      const invitationData = await invitation.findByCode(codigo);
      
      if (!invitationData || invitationData.estado !== 'pendiente') {
        req.flash('error', 'Invitación no válida o ya procesada');
        return res.redirect('/auth/login');
      }

      // Verificar si el email ya existe
      const userModel = new User();
      const existingUser = await userModel.findByEmail(email);
      
      if (existingUser) {
        req.flash('error', 'Ya existe una cuenta con este email. Por favor inicia sesión.');
        return res.redirect(`/projects/invitations/accept/${codigo}`);
      }

      // Obtener información del proyecto para asignar el área de trabajo correcta
      const project = await this.projectModel.findById(invitationData.proyecto_id);
      if (!project) {
        req.flash('error', 'Proyecto no encontrado');
        return res.redirect('/auth/login');
      }

      // Crear nuevo usuario con rol de estudiante
      // Generar código de usuario único
      const generateUserCode = () => {
        const timestamp = Date.now().toString().slice(-6);
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `EST${timestamp}${random}`;
      };
      
      const newUserResult = await userModel.create({
        codigo_usuario: generateUserCode(),
        nombres,
        apellidos,
        email,
        password: password, // El modelo User se encarga del hash automáticamente
        rol_id: 5, // Rol de estudiante
        area_trabajo_id: project.area_trabajo_id || 1
      });

      // Extraer el ID del resultado
      const newUserId = newUserResult.id;

      // Iniciar sesión automáticamente con información del rol
      const usersWithRole = await userModel.findWithRole({ id: newUserId });
      const newUser = usersWithRole[0];
      req.session.user = newUser;

      // Agregar usuario al proyecto y marcar invitación como aceptada
      await this.addUserToProject(invitationData.proyecto_id, newUserId);
      await invitation.accept(invitationData.id, newUserId);

      req.flash('success', `¡Bienvenido! Te has registrado y unido al proyecto "${invitationData.proyecto_nombre}" exitosamente.`);
      res.redirect(`/projects/${invitationData.proyecto_id}`);

    } catch (error) {
      console.error('Error registering from invitation:', error);
      req.flash('error', 'Error al procesar el registro');
      res.redirect(`/projects/invitations/accept/${req.params.codigo}`);
    }
  }

  // Procesar login desde invitación
  async loginFromInvitation(req, res) {
    try {
      const { codigo } = req.params;
      const { email, password } = req.body;

      // Verificar que la invitación existe y está pendiente
      const invitation = new Invitation();
      const invitationData = await invitation.findByCode(codigo);
      
      if (!invitationData || invitationData.estado !== 'pendiente') {
        req.flash('error', 'Invitación no válida o ya procesada');
        return res.redirect('/auth/login');
      }

      // Verificar credenciales
      const userModel = new User();
      const user = await userModel.findByEmail(email);
      
      if (!user) {
        req.flash('error', 'Email no encontrado. ¿Necesitas crear una cuenta?');
        return res.redirect(`/projects/invitations/accept/${codigo}`);
      }

      // Validar que tenemos los datos necesarios para la comparación
      if (!password || !user.password_hash) {
        req.flash('error', 'Error en la validación de credenciales');
        return res.redirect(`/projects/invitations/accept/${codigo}`);
      }

      const bcrypt = require('bcrypt');
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      
      if (!isValidPassword) {
        req.flash('error', 'Contraseña incorrecta');
        return res.redirect(`/projects/invitations/accept/${codigo}`);
      }

      // Iniciar sesión con información del rol
      const usersWithRole = await userModel.findWithRole({ id: user.id });
      const userWithRole = usersWithRole[0];
      req.session.user = userWithRole;

      // Obtener información del proyecto para asignar el área de trabajo correcta
      const project = await this.projectModel.findById(invitationData.proyecto_id);
      if (!project) {
        req.flash('error', 'Proyecto no encontrado');
        return res.redirect('/auth/login');
      }

      // Asegurar que el usuario esté en el área de trabajo del proyecto
      const userBelongsToArea = await userModel.belongsToArea(user.id, project.area_trabajo_id);
      
      if (!userBelongsToArea) {
          await userModel.assignToArea(user.id, project.area_trabajo_id, false, false);
          console.log(`Usuario ${user.id} agregado al área de trabajo ${project.area_trabajo_id}`);
      }
      // Sincronizar área primaria si está vacía
      await userModel.setPrimaryAreaIfEmpty(user.id, project.area_trabajo_id);

      // Agregar usuario al proyecto y marcar invitación como aceptada
      await this.addUserToProject(invitationData.proyecto_id, user.id);
      await invitation.accept(invitationData.id, user.id);

      req.flash('success', `¡Bienvenido de vuelta! Te has unido al proyecto "${invitationData.proyecto_nombre}" exitosamente.`);
      res.redirect(`/projects/${invitationData.proyecto_id}`);

    } catch (error) {
      console.error('Error logging in from invitation:', error);
      req.flash('error', 'Error al procesar el inicio de sesión');
      res.redirect(`/projects/invitations/accept/${req.params.codigo}`);
    }
  }

  // =============================================
  // GESTIÓN DE ENTREGABLES DEL PROYECTO
  // =============================================

  // Obtener entregables del proyecto (API)
  async getProjectDeliverables(req, res) {
    try {
      const projectId = req.params.id;
      const user = req.session.user;

      // Verificar acceso al proyecto
      const hasAccess = await this.checkProjectAccess(projectId, user);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      }

      // Obtener entregables del proyecto
      const deliverables = await this.entregableModel.findByProject(projectId);

      // Calcular información adicional para cada entregable
      const deliverablesWithDetails = deliverables.map(deliverable => {
        const dueDateSource = deliverable.fecha_limite || deliverable.fecha_entrega;
        const dueDate = dueDateSource ? new Date(dueDateSource) : null;
        const today = new Date();
        const diffTime = dueDate ? (dueDate - today) : 0;
        const diffDays = dueDate ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;

        return {
          ...deliverable,
          dias_restantes: diffDays,
          is_overdue: dueDate ? (diffDays < 0 && deliverable.estado === 'pendiente') : false,
          is_due_soon: dueDate ? (diffDays <= 7 && diffDays >= 0 && deliverable.estado === 'pendiente') : false
        };
      });

      res.json({
        success: true,
        deliverables: deliverablesWithDetails
      });

    } catch (error) {
      console.error('Error getting project deliverables:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear nuevo entregable
  async createDeliverable(req, res) {
    try {
      const projectId = req.params.id;
      const user = req.session.user;
      const { titulo, descripcion, fecha_entrega, fase_id } = req.body;

      // Verificar acceso al proyecto
      const hasAccess = await this.checkProjectAccess(projectId, user);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      }

      // Validaciones
      if (!titulo || !fecha_entrega) {
        return res.status(400).json({ 
          error: 'El título y la fecha de entrega son obligatorios' 
        });
      }

      // Verificar que la fecha de entrega sea futura
      const dueDate = new Date(fecha_entrega);
      const today = new Date();
      if (dueDate <= today) {
        return res.status(400).json({ 
          error: 'La fecha de entrega debe ser posterior a hoy' 
        });
      }

      // Crear el entregable
      const deliverableData = {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        proyecto_id: projectId,
        fase_id: fase_id || 1, // Por defecto fase 1 (Propuesta)
        fecha_entrega: fecha_entrega,
        estado: 'pendiente',
        created_by: user.id
      };

      const newDeliverable = await this.entregableModel.create(deliverableData);

      res.json({
        success: true,
        message: 'Entregable creado exitosamente',
        deliverable: newDeliverable
      });

    } catch (error) {
      console.error('Error creating deliverable:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar entregable
  async updateDeliverable(req, res) {
    try {
      const projectId = req.params.id;
      const deliverableId = req.params.deliverableId;
      const user = req.session.user;
      const { titulo, descripcion, fecha_entrega, estado, fase_id } = req.body;

      // Verificar acceso al proyecto
      const hasAccess = await this.checkProjectAccess(projectId, user);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      }

      // Verificar que el entregable existe y pertenece al proyecto
      const deliverable = await this.entregableModel.findById(deliverableId);
      if (!deliverable || deliverable.proyecto_id != projectId) {
        return res.status(404).json({ error: 'Entregable no encontrado' });
      }

      // Validaciones
      if (!titulo || !fecha_entrega) {
        return res.status(400).json({ 
          error: 'El título y la fecha de entrega son obligatorios' 
        });
      }

      // Preparar datos de actualización
      const updateData = {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        fecha_entrega: fecha_entrega,
        updated_at: new Date()
      };

      // Solo permitir cambio de estado a coordinadores y directores
      if (estado && ['Coordinador Académico', 'Director de Proyecto'].includes(user.rol_nombre)) {
        updateData.estado = estado;
      }

      // Solo permitir cambio de fase a coordinadores y directores
      if (fase_id && ['Coordinador Académico', 'Director de Proyecto'].includes(user.rol_nombre)) {
        updateData.fase_id = fase_id;
      }

      // Actualizar el entregable
      await this.entregableModel.update(deliverableId, updateData);

      res.json({
        success: true,
        message: 'Entregable actualizado exitosamente'
      });

    } catch (error) {
      console.error('Error updating deliverable:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar entregable
  async deleteDeliverable(req, res) {
    try {
      const projectId = req.params.id;
      const deliverableId = req.params.deliverableId;
      const user = req.session.user;

      // Verificar acceso al proyecto
      const hasAccess = await this.checkProjectAccess(projectId, user);
      if (!hasAccess) {
        return res.status(403).json({ error: 'No tienes acceso a este proyecto' });
      }

      // Solo coordinadores y directores pueden eliminar entregables
      if (!['Coordinador Académico', 'Director de Proyecto'].includes(user.rol_nombre)) {
        return res.status(403).json({ error: 'No tienes permisos para eliminar entregables' });
      }

      // Verificar que el entregable existe y pertenece al proyecto
      const deliverable = await this.entregableModel.findById(deliverableId);
      if (!deliverable || deliverable.proyecto_id != projectId) {
        return res.status(404).json({ error: 'Entregable no encontrado' });
      }

      // No permitir eliminar entregables que ya fueron entregados
      if (deliverable.estado === 'entregado' || deliverable.estado === 'aprobado') {
        return res.status(400).json({ 
          error: 'No se puede eliminar un entregable que ya fue entregado o aprobado' 
        });
      }

      // Eliminar el entregable
      await this.entregableModel.delete(deliverableId);

      res.json({
        success: true,
        message: 'Entregable eliminado exitosamente'
      });

    } catch (error) {
      console.error('Error deleting deliverable:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Método para calcular el progreso de un proyecto
  async calculateProjectProgress(projectId) {
    try {
      // Obtener entregables del proyecto
      const deliverables = await this.entregableModel.findByProject(projectId);

      // Calcular progreso basado en entregables
      const completedDeliverables = deliverables.filter(d => d.estado === 'completado').length;
      const deliverableProgress = deliverables.length > 0 ? (completedDeliverables / deliverables.length) * 100 : 0;

      // Obtener información del proyecto para calcular progreso temporal
      const project = await this.projectModel.findById(projectId);
      let timeProgress = 0;

      // Función de parseo seguro de fechas
      const parseDate = (value) => {
        if (!value) return null;
        if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
        if (typeof value === 'string') {
          const iso = new Date(value);
          if (!isNaN(iso.getTime())) return iso;
          const m = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
          if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        }
        return null;
      };
      
      const startDate = project ? parseDate(project.fecha_inicio) : null;
      const endDate = project ? parseDate(project.fecha_fin) : null;
      const currentDate = new Date();
      
      if (startDate && endDate) {
        const totalDuration = endDate - startDate;
        const elapsedTime = currentDate - startDate;
        
        if (totalDuration > 0) {
          timeProgress = Math.min(100, Math.max(0, (elapsedTime / totalDuration) * 100));
        }
      }

      // Progreso ponderado: 70% entregables, 30% tiempo
      const overallProgress = Math.round((deliverableProgress * 0.7) + (timeProgress * 0.3));
      
      return Math.min(100, Math.max(0, overallProgress));
    } catch (error) {
      console.error('Error calculating project progress:', error);
      return 0;
    }
  }

  // Método auxiliar para verificar acceso al proyecto
  async checkProjectAccess(projectId, user) {
    try {
      const project = await this.projectModel.findById(projectId);
      
      if (!project) {
        return false;
      }

      // Verificar permisos según el rol
      switch (user.rol_nombre) {
        case 'Administrador General':
          // Acceso total sin restricción por área
          return true;
        case 'Director de Proyecto':
          // Directores acceden a sus proyectos independientemente del área
          return project.director_id === user.id;
        case 'Coordinador Académico': {
          // Coordinadores: acceso si son miembros activos del proyecto o si el proyecto pertenece a cualquiera de sus áreas
          const isProjectMember = await this.projectModel.findProjectMember(projectId, user.id);
          if (isProjectMember) return true;
          try {
            const userModel = new User();
            const areas = await userModel.getUserAreas(user.id);
            const areaIds = Array.isArray(areas) ? areas.map(a => a.area_trabajo_id) : [];
            return areaIds.includes(project.area_trabajo_id) || user.area_trabajo_id === project.area_trabajo_id;
          } catch (e) {
            // Fallback: usar el área principal del usuario
            return user.area_trabajo_id === project.area_trabajo_id;
          }
        }
        case 'Estudiante': {
          // Estudiantes: acceso si son el estudiante principal o miembros activos; si no, restringir por área principal
          const isMainStudent = project.estudiante_id === user.id;
          const isProjectMember = await this.projectModel.findProjectMember(projectId, user.id);
          if (isMainStudent || isProjectMember) return true;
          return user.area_trabajo_id === project.area_trabajo_id;
        }
        default:
          // Otros roles: restringir por coincidencia de área principal
          return user.area_trabajo_id === project.area_trabajo_id;
      }
    } catch (error) {
      console.error('Error checking project access:', error);
      return false;
    }
  }

   // ==================== GESTIÓN DE COMENTARIOS ====================

   // Obtener comentarios de un proyecto
   async getProjectComments(req, res) {
     try {
       const { projectId } = req.params;
       const user = req.session.user;

       if (!user) {
         return res.status(401).json({ success: false, message: 'No autorizado' });
       }

       // Verificar acceso al proyecto
       const hasAccess = await this.checkProjectAccess(projectId, user);
       if (!hasAccess) {
         return res.status(403).json({ success: false, message: 'No tienes acceso a este proyecto' });
       }

       const comments = await this.projectModel.getComments(projectId);
       res.json({ success: true, data: comments });
     } catch (error) {
       console.error('Error getting project comments:', error);
       res.status(500).json({ success: false, message: 'Error interno del servidor' });
     }
   }

   // Agregar comentario a un proyecto
   async addProjectComment(req, res) {
     try {
       const { projectId } = req.params;
       const { comentario, tipo } = req.body;
       const user = req.session.user;

       if (!user) {
         return res.status(401).json({ success: false, message: 'No autorizado' });
       }

       if (!comentario || comentario.trim() === '') {
         return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
       }

       // Verificar acceso al proyecto
       const hasAccess = await this.checkProjectAccess(projectId, user);
       if (!hasAccess) {
         return res.status(403).json({ success: false, message: 'No tienes acceso a este proyecto' });
       }

       // Manejar archivo adjunto si existe
       let archivo_adjunto = null;
       if (req.file) {
         archivo_adjunto = {
           nombre_original: req.file.originalname,
           nombre_archivo: req.file.filename,
           ruta: req.file.path,
           tipo_mime: req.file.mimetype,
           tamaño: req.file.size
         };
       }

       const commentId = await this.projectModel.addComment(
         projectId,
         user.id,
         comentario.trim(),
         tipo || 'comentario',
         archivo_adjunto ? JSON.stringify(archivo_adjunto) : null
       );

       if (commentId) {
         res.json({ success: true, message: 'Comentario agregado correctamente', commentId });
       } else {
         res.status(400).json({ success: false, message: 'No se pudo agregar el comentario' });
       }
     } catch (error) {
       console.error('Error adding project comment:', error);
       res.status(500).json({ success: false, message: 'Error interno del servidor' });
     }
   }

   // Obtener comentarios de un entregable
   async getDeliverableComments(req, res) {
     try {
       const { deliverableId } = req.params;
       const user = req.session.user;

       if (!user) {
         return res.status(401).json({ success: false, message: 'No autorizado' });
       }

       // Verificar que el entregable existe y el usuario tiene acceso
       const deliverable = await this.entregableModel.findById(deliverableId);
       if (!deliverable) {
         return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
       }

       // Verificar acceso al proyecto del entregable
       const hasAccess = await this.checkProjectAccess(deliverable.proyecto_id, user);
       if (!hasAccess) {
         return res.status(403).json({ success: false, message: 'No tienes acceso a este entregable' });
       }

       const comments = await this.entregableModel.getComments(deliverableId);
       res.json({ success: true, data: comments });
     } catch (error) {
       console.error('Error getting deliverable comments:', error);
       res.status(500).json({ success: false, message: 'Error interno del servidor' });
     }
   }

   // Agregar comentario a un entregable
   async addDeliverableComment(req, res) {
     try {
       const { deliverableId } = req.params;
       const { comentario, tipo } = req.body;
       const user = req.session.user;

       if (!user) {
         return res.status(401).json({ success: false, message: 'No autorizado' });
       }

       if (!comentario || comentario.trim() === '') {
         return res.status(400).json({ success: false, message: 'El comentario no puede estar vacío' });
       }

       // Verificar que el entregable existe y el usuario tiene acceso
       const deliverable = await this.entregableModel.findById(deliverableId);
       if (!deliverable) {
         return res.status(404).json({ success: false, message: 'Entregable no encontrado' });
       }

       // Verificar acceso al proyecto del entregable
       const hasAccess = await this.checkProjectAccess(deliverable.proyecto_id, user);
       if (!hasAccess) {
         return res.status(403).json({ success: false, message: 'No tienes acceso a este entregable' });
       }

       // Manejar archivo adjunto si existe
       let archivo_adjunto = null;
       if (req.file) {
         archivo_adjunto = {
           nombre_original: req.file.originalname,
           nombre_archivo: req.file.filename,
           ruta: req.file.path,
           tipo_mime: req.file.mimetype,
           tamaño: req.file.size
         };
       }

       const commentId = await this.entregableModel.addComment(
         deliverableId,
         user.id,
         comentario.trim(),
         tipo || 'comentario',
         archivo_adjunto ? JSON.stringify(archivo_adjunto) : null
       );

       if (commentId) {
         res.json({ success: true, message: 'Comentario agregado correctamente', commentId });
       } else {
         res.status(400).json({ success: false, message: 'No se pudo agregar el comentario' });
       }
     } catch (error) {
       console.error('Error adding deliverable comment:', error);
       res.status(500).json({ success: false, message: 'Error interno del servidor' });
     }
  }
  
  // ===== MÉTODOS PARA COORDINADOR =====
  
  async getProjectsByCoordinator(coordinatorId) {
    try {
      const query = `
        SELECT 
          p.*,
          CONCAT(u_est.nombres, ' ', u_est.apellidos) AS estudiante_nombre,
          CONCAT(u_dir.nombres, ' ', u_dir.apellidos) AS director_nombre,
          CONCAT(u_eval.nombres, ' ', u_eval.apellidos) AS evaluador_nombre,
          COUNT(d.id) AS total_entregables,
          SUM(CASE WHEN d.estado = 'completado' THEN 1 ELSE 0 END) AS entregables_completados
        FROM proyectos p
        INNER JOIN proyecto_usuarios pu 
          ON p.id = pu.proyecto_id 
         AND pu.usuario_id = ? 
         AND pu.estado = 'activo'
        LEFT JOIN usuarios u_est ON p.estudiante_id = u_est.id
        LEFT JOIN usuarios u_dir ON p.director_id = u_dir.id
        LEFT JOIN usuarios u_eval ON p.evaluador_id = u_eval.id
        LEFT JOIN entregables d ON d.proyecto_id = p.id
        GROUP BY p.id
        ORDER BY p.created_at DESC
      `;
      const [rows] = await this.projectModel.db.execute(query, [coordinatorId]);
      return rows;
    } catch (error) {
      console.error('Error getting projects by coordinator:', error);
      throw error;
    }
  }
}

module.exports = ProjectController;