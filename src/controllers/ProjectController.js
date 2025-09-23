const Project = require('../models/Project');
const User = require('../models/User');
const Deliverable = require('../models/Deliverable');
const Evaluation = require('../models/Evaluation');
const Invitation = require('../models/Invitation');
const { pool } = require('../config/database');
const nodemailer = require('nodemailer'); // Necesitarás instalarlo: npm install nodemailer

class ProjectController {
  constructor() {
    this.projectModel = new Project();
    this.userModel = new User();
    this.deliverableModel = new Deliverable();
    this.evaluationModel = new Evaluation();
    this.db = pool; // Inicializar la conexión a la base de datos
  }

  // Listar proyectos
  async index(req, res) {
    try {
      const user = req.session.user;
      const { search, estado, page = 1 } = req.query;
      const limit = 10;
      const offset = (page - 1) * limit;
      
      let projects;
      
      // Agregar filtro por área de trabajo
      const areaTrabajoId = req.areaTrabajoId;
      const conditions = {};
      
      if (estado) conditions.estado = estado;
      if (areaTrabajoId) conditions.area_trabajo_id = areaTrabajoId;
      
      if (search) {
        projects = await this.projectModel.search(search, conditions);
      } else {
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
      const [directors, students, coordinators, evaluators, lineasResult, ciclosResult] = await Promise.all([
        this.userModel.findByRole('Director de Proyecto'),
        this.userModel.findByRole('Estudiante'),
        this.userModel.findByRole('Coordinador Académico'),
        this.userModel.findByRole('Evaluador'),
        this.userModel.db.execute('SELECT * FROM lineas_investigacion WHERE activo = 1'),
        this.userModel.db.execute('SELECT * FROM ciclos_academicos WHERE activo = 1')
      ]);
      
      res.render('projects/create', {
        title: 'Crear Proyecto',
        user,
        directors: directors || [],
        students: students || [],
        coordinators: coordinators || [],
        evaluators: evaluators || [],
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
        fecha_inicio,
        fecha_fin,
        director_id,
        linea_investigacion_id,
        ciclo_academico_id,
        generate_invitation,
        max_uses,
        expires_in_days
      } = req.body;
      
      // Validaciones básicas
      if (!titulo || !descripcion || !objetivos || !director_id || !fecha_inicio || !fecha_fin) {
        req.flash('error', 'Los campos Título, Descripción, Objetivos, Director, Fecha de Inicio y Fecha de Fin son obligatorios');
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
      
      const projectData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        objetivos: objetivos.trim(),
        fecha_inicio,
        fecha_fin,
        estudiante_id: user.id,
        director_id: parseInt(director_id),
        linea_investigacion_id: linea_investigacion_id ? parseInt(linea_investigacion_id) : null,
        ciclo_academico_id: ciclo_academico_id ? parseInt(ciclo_academico_id) : null,
        area_trabajo_id: req.areaTrabajoId, // Asignar área de trabajo del usuario
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
        req.flash('success', `Proyecto creado exitosamente. Código de invitación: ${invitation.codigo}`);
      } else {
        req.flash('success', 'Proyecto creado exitosamente');
      }
      
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
      
      // Verificar que el proyecto pertenezca al área de trabajo del usuario
      if (project.area_trabajo_id !== req.areaTrabajoId) {
        req.flash('error', 'No tienes permisos para ver este proyecto');
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
      
      // Solo estudiantes pueden unirse a proyectos
      if (user.rol_nombre !== 'Estudiante') {
        req.flash('error', 'Solo los estudiantes pueden unirse a proyectos usando códigos de invitación');
        return res.redirect('/dashboard');
      }
      
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
      
      // Solo estudiantes pueden unirse a proyectos
      if (user.rol_nombre !== 'Estudiante') {
        req.flash('error', 'Solo los estudiantes pueden unirse a proyectos');
        return res.redirect('/dashboard');
      }
      
      if (!invitation_code || invitation_code.trim().length === 0) {
        req.flash('error', 'El código de invitación es obligatorio');
        return res.redirect('/projects/join');
      }
      
      // Validar y procesar la invitación
      const result = await this.projectModel.joinProjectWithCode(invitation_code.trim(), user.id);
      
      if (result.success) {
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
  
          // Aceptar la invitación
          await invitation.accept(invitationData.id, userId);
  
          // Agregar usuario al proyecto
          await this.addUserToProject(invitationData.proyecto_id, userId);
  
          // Establecer mensaje flash de éxito
          req.flash('success', `Te has unido exitosamente al proyecto "${invitationData.proyecto_nombre}"`);
          
          // Redirigir al dashboard
          res.redirect('/dashboard');
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
          res.redirect('/dashboard');
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
          const [existing] = await this.db.execute(query, [projectId, userId]);
          
          if (existing.length === 0) {
              // Agregar usuario al proyecto con rol por defecto
              const insertQuery = 'INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion) VALUES (?, ?, ?, NOW())';
              await this.db.execute(insertQuery, [projectId, userId, 'estudiante']);
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

      // Crear nuevo usuario con rol de estudiante
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      
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
        password: hashedPassword,
        rol_id: 4, // Rol de estudiante
        area_trabajo_id: invitationData.area_trabajo_id || 1
      });

      // Extraer el ID del resultado
      const newUserId = newUserResult.id;

      // Iniciar sesión automáticamente
      const newUser = await userModel.findById(newUserId);
      req.session.user = newUser;

      // Agregar usuario al proyecto y marcar invitación como aceptada
      await this.addUserToProject(invitationData.proyecto_id, newUserId);
      await invitation.accept(invitationData.id, newUserId);

      req.flash('success', `¡Bienvenido! Te has registrado y unido al proyecto "${invitationData.proyecto_nombre}" exitosamente.`);
      res.redirect('/dashboard');

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

      // Iniciar sesión
      req.session.user = user;

      // Agregar usuario al proyecto y marcar invitación como aceptada
      await this.addUserToProject(invitationData.proyecto_id, user.id);
      await invitation.accept(invitationData.id, user.id);

      req.flash('success', `¡Bienvenido de vuelta! Te has unido al proyecto "${invitationData.proyecto_nombre}" exitosamente.`);
      res.redirect('/dashboard');

    } catch (error) {
      console.error('Error logging in from invitation:', error);
      req.flash('error', 'Error al procesar el inicio de sesión');
      res.redirect(`/projects/invitations/accept/${req.params.codigo}`);
    }
  }
}

module.exports = ProjectController;