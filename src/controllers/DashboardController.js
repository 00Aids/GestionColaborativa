const User = require('../models/User');
const Project = require('../models/Project');
const Deliverable = require('../models/Deliverable');
const Evaluation = require('../models/Evaluation');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const { pool } = require('../config/database');

class DashboardController {
  constructor() {
    this.userModel = new User();
    this.projectModel = new Project();
    this.deliverableModel = new Deliverable();
    this.evaluationModel = new Evaluation();
    this.taskModel = new Task();
    this.notificationModel = new Notification();
  }

  // Dashboard principal
  async index(req, res) {
    try {
      const user = req.session.user;
      const roleName = user.rol_nombre;
      
      // En lugar de redirigir, usar directamente el dashboard Kanban
      return this.kanbanDashboard(req, res);
      
      // Comentar o eliminar las redirecciones específicas por rol
      /*
      switch (roleName) {
        case 'Administrador':
          return res.redirect('/admin/dashboard');
        case 'Coordinador':
          return res.redirect('/coordinator/dashboard');
        case 'Director de Proyecto': // ← CAMBIO AQUÍ
          return res.redirect('/director/dashboard');
        case 'Evaluador':
          return res.redirect('/evaluator/dashboard');
        case 'Estudiante':
          return res.redirect('/student/dashboard');
        default:
          return this.showGenericDashboard(req, res);
      }
      */
    } catch (error) {
      console.error('Error in dashboard index:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard genérico
  async showGenericDashboard(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener estadísticas básicas
      const stats = {
        totalProjects: 0,
        totalDeliverables: 0,
        completedEvaluations: 0,
        pendingEvaluations: 0
      };
  
      res.render('common/kanban', {
        user,
        stats,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in generic dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard para Administrador
  async adminDashboard(req, res) {
    try {
      const { user } = req.session;
      
      // Verificar que el usuario existe
      if (!user) {
        req.flash('error', 'Sesión expirada. Por favor, inicia sesión nuevamente.');
        return res.redirect('/auth/login');
      }
      
      // Obtener estadísticas filtradas por área del usuario
      let projectStatsRaw, deliverableStatsRaw, evaluationStatsRaw;
      let overdueDeliverables, recentProjects;
      
      if (req.areaTrabajoId) {
        // Usuario tiene área asignada - filtrar por área
        
        // Usar método específico para estadísticas por área si existe
        projectStatsRaw = await this.projectModel.getStatisticsByArea(req.areaTrabajoId);
        
        // Para entregables, obtener todos los de proyectos del área
        const areaProjects = await this.projectModel.findByArea(req.areaTrabajoId);
        const areaProjectIds = areaProjects.map(p => p.id);
        
        if (areaProjectIds.length > 0) {
          // Obtener entregables de proyectos del área
          const areaDeliverables = await this.deliverableModel.findWithProject({ 
            area_trabajo_id: req.areaTrabajoId 
          });
          
          // Calcular estadísticas manualmente
          deliverableStatsRaw = [
            { estado: 'pendiente', cantidad: areaDeliverables.filter(d => d.estado === 'pendiente').length },
            { estado: 'en_progreso', cantidad: areaDeliverables.filter(d => d.estado === 'en_progreso').length },
            { estado: 'completado', cantidad: areaDeliverables.filter(d => d.estado === 'completado').length }
          ].filter(stat => stat.cantidad > 0);
          
          // Entregables vencidos del área
          overdueDeliverables = areaDeliverables.filter(d => {
            const today = new Date();
            const dueDate = new Date(d.fecha_limite);
            return dueDate < today && d.estado !== 'completado';
          });
        } else {
          deliverableStatsRaw = [];
          overdueDeliverables = [];
        }
        
        // Evaluaciones del área (simplificado por ahora)
        evaluationStatsRaw = [];
        
        // Proyectos recientes del área
        recentProjects = areaProjects.slice(0, 5);
        
      } else {
        // Usuario sin área - mostrar estadísticas vacías o globales según política
        projectStatsRaw = [];
        deliverableStatsRaw = [];
        evaluationStatsRaw = [];
        overdueDeliverables = [];
        recentProjects = [];
      }
  
      // Procesar estadísticas para obtener totales
      const projectStats = {
        total: projectStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0),
        byStatus: projectStatsRaw
      };
  
      const deliverableStats = {
        total: deliverableStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0),
        byStatus: deliverableStatsRaw
      };
  
      const evaluationStats = {
        total: evaluationStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0),
        byStatus: evaluationStatsRaw,
        averageGrade: evaluationStatsRaw.length > 0 ? 
          evaluationStatsRaw.reduce((sum, stat) => sum + (stat.promedio_nota || 0), 0) / evaluationStatsRaw.length : 0
      };
  
      // Obtener usuarios recientes (sin filtrar por área por ahora)
      const recentUsers = await this.userModel.findWithRole({ activo: true });
  
      res.render('admin/dashboard', {
        user: user,
        projectStats,
        deliverableStats,
        evaluationStats,
        overdueDeliverables: overdueDeliverables || [],
        recentUsers: recentUsers || [],
        recentProjects: recentProjects || [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard para Coordinador
  async coordinatorDashboard(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener datos actualizados del usuario desde la base de datos
      const userDetails = await this.userModel.findById(user.id);
      
      // Filtrar por área de trabajo del coordinador si tiene una asignada
      const areaFilter = userDetails.area_trabajo_id ? { area_trabajo_id: userDetails.area_trabajo_id } : {};
      
      // Obtener estadísticas del área o globales
      const [projectStatsRaw, allProjects] = await Promise.all([
        userDetails.area_trabajo_id 
          ? this.projectModel.getStatisticsByArea(userDetails.area_trabajo_id)
          : this.projectModel.getStatistics(),
        userDetails.area_trabajo_id 
          ? this.projectModel.findByArea(userDetails.area_trabajo_id)
          : this.projectModel.findWithDetails()
      ]);

      // Procesar estadísticas de proyectos
      const projectStats = {
        total: projectStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0),
        activos: projectStatsRaw.filter(s => ['en_desarrollo', 'en_revision', 'aprobado'].includes(s.estado))
                                .reduce((sum, stat) => sum + stat.cantidad, 0),
        completados: projectStatsRaw.filter(s => s.estado === 'finalizado')
                                   .reduce((sum, stat) => sum + stat.cantidad, 0),
        pendientes: projectStatsRaw.filter(s => ['borrador', 'enviado'].includes(s.estado))
                                  .reduce((sum, stat) => sum + stat.cantidad, 0),
        byStatus: projectStatsRaw
      };

      // Obtener entregables del área
      const allDeliverables = userDetails.area_trabajo_id 
        ? await this.deliverableModel.findWithProject(areaFilter)
        : await this.deliverableModel.findWithProject();

      // Estadísticas de entregables
      const deliverableStats = {
        total: allDeliverables.length,
        pendientes: allDeliverables.filter(d => d.estado === 'pendiente').length,
        en_progreso: allDeliverables.filter(d => d.estado === 'en_progreso').length,
        completados: allDeliverables.filter(d => d.estado === 'completado').length,
        vencidos: allDeliverables.filter(d => {
          const today = new Date();
          const dueDate = new Date(d.fecha_limite);
          return dueDate < today && d.estado !== 'completado';
        }).length
      };

      // Obtener evaluaciones del área
      const allEvaluations = userDetails.area_trabajo_id 
        ? await this.evaluationModel.findByArea(userDetails.area_trabajo_id)
        : await this.evaluationModel.findAll();

      const evaluationStats = {
        total: allEvaluations.length,
        pendientes: allEvaluations.filter(e => e.estado === 'pendiente').length,
        completadas: allEvaluations.filter(e => e.estado === 'completada').length,
        promedio: allEvaluations.length > 0 
          ? (allEvaluations.reduce((sum, e) => sum + (e.calificacion || 0), 0) / allEvaluations.length).toFixed(1)
          : 0
      };

      // Obtener estudiantes del área
      const students = userDetails.area_trabajo_id 
        ? await this.userModel.findByAreaAndRole(userDetails.area_trabajo_id, 'Estudiante')
        : await this.userModel.findByRole('Estudiante');

      // Proyectos bajo supervisión directa (donde el coordinador es supervisor)
      const myProjects = allProjects.filter(p => 
        p.supervisor_id === user.id || 
        (userDetails.area_trabajo_id && p.area_trabajo_id === userDetails.area_trabajo_id)
      ).slice(0, 10);

      // Entregables próximos a vencer (próximos 7 días)
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      
      const upcomingDeliverables = allDeliverables.filter(d => {
        const dueDate = new Date(d.fecha_limite);
        const today = new Date();
        return dueDate >= today && dueDate <= nextWeek && d.estado !== 'completado';
      }).sort((a, b) => new Date(a.fecha_limite) - new Date(b.fecha_limite)).slice(0, 5);

      // Entregables vencidos
      const overdueDeliverables = allDeliverables.filter(d => {
        const today = new Date();
        const dueDate = new Date(d.fecha_limite);
        return dueDate < today && d.estado !== 'completado';
      }).slice(0, 5);

      // Proyectos recientes (últimos 5)
      const recentProjects = allProjects
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 5);

      // Actividad reciente (simulada por ahora)
      const recentActivity = [
        ...recentProjects.map(p => ({
          tipo: 'proyecto',
          titulo: `Nuevo proyecto: ${p.titulo}`,
          fecha: p.created_at,
          icono: '📁'
        })),
        ...upcomingDeliverables.map(d => ({
          tipo: 'entregable',
          titulo: `Entregable próximo: ${d.titulo}`,
          fecha: d.fecha_limite,
          icono: '⏰'
        }))
      ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).slice(0, 8);

      // Códigos de invitación activos (simulado por ahora)
      const invitationCodes = [
        {
          codigo: 'COORD2024A',
          tipo: 'Estudiante',
          usos: 5,
          limite: 10,
          expira: '2024-12-31',
          activo: true
        },
        {
          codigo: 'EVAL2024B',
          tipo: 'Evaluador',
          usos: 2,
          limite: 5,
          expira: '2024-12-31',
          activo: true
        }
      ];

      // Notificaciones recientes
      const notifications = await this.notificationModel.findByUser(user.id, { limit: 5 });

      res.render('coordinator/dashboard', {
        user: userDetails,
        projectStats,
        deliverableStats,
        evaluationStats,
        students: students || [],
        myProjects: myProjects || [],
        upcomingDeliverables: upcomingDeliverables || [],
        overdueDeliverables: overdueDeliverables || [],
        recentProjects: recentProjects || [],
        recentActivity: recentActivity || [],
        invitationCodes: invitationCodes || [],
        notifications: notifications || [],
        areaInfo: userDetails.area_trabajo_id ? {
          id: userDetails.area_trabajo_id,
          codigo: userDetails.area_codigo,
          nombre: userDetails.area_nombre
        } : null,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in coordinator dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard para Estudiante
  async studentDashboard(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener proyectos donde el estudiante es miembro
      const myProjects = await this.projectModel.findStudentProjects(user.id);
      
      // Entregables pendientes del estudiante
      const myDeliverables = [];
      for (const project of myProjects) {
        const deliverables = await this.deliverableModel.findByProject(project.id);
        if (deliverables && deliverables.length > 0) {
          myDeliverables.push(...deliverables);
        }
      }

      // Evaluaciones del estudiante
      const myEvaluations = [];
      for (const project of myProjects) {
        const evaluations = await this.evaluationModel.findByProject(project.id);
        if (evaluations && evaluations.length > 0) {
          myEvaluations.push(...evaluations);
        }
      }

      const stats = {
        totalProjects: myProjects.length,
        totalDeliverables: myDeliverables.length,
        completedEvaluations: myEvaluations.filter(e => e.estado === 'completada').length,
        pendingEvaluations: myEvaluations.filter(e => e.estado === 'pendiente').length
      };

      res.render('student/dashboard', {
        user,
        stats,
        myProjects: myProjects.slice(0, 5), // Últimos 5
        myDeliverables: myDeliverables.slice(0, 5), // Últimos 5
        myEvaluations: myEvaluations.slice(0, 5), // Últimas 5
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in student dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard para Director
  async directorDashboard(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener proyectos dirigidos
      const directedProjects = await this.projectModel.findByDirector(user.id);
      
      // Entregables de proyectos dirigidos
      const directedDeliverables = [];
      for (const project of directedProjects) {
        const deliverables = await this.deliverableModel.findByProject(project.id);
        if (deliverables && deliverables.length > 0) {
          directedDeliverables.push(...deliverables);
        }
      }

      // Evaluaciones pendientes
      const pendingEvaluations = [];
      for (const project of directedProjects) {
        const evaluations = await this.evaluationModel.findByProject(project.id);
        if (evaluations && evaluations.length > 0) {
          pendingEvaluations.push(...evaluations.filter(e => e.estado === 'pendiente'));
        }
      }

      const stats = {
        totalProjects: directedProjects.length,
        totalDeliverables: directedDeliverables.length,
        completedEvaluations: directedDeliverables.filter(d => d.estado === 'aprobado').length,
        pendingEvaluations: pendingEvaluations.length
      };

      res.render('director/dashboard', {
        user,
        stats,
        directedProjects: directedProjects.slice(0, 10),
        directedDeliverables: directedDeliverables.slice(0, 10),
        pendingEvaluations: pendingEvaluations.slice(0, 10),
        recentProjects: directedProjects.slice(0, 5), // Agregar recentProjects
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in director dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard para Evaluador
  async evaluatorDashboard(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener evaluaciones asignadas al evaluador
      const assignedEvaluations = await this.evaluationModel.findByEvaluator(user.id);
      
      // Estadísticas
      const stats = {
        totalEvaluations: assignedEvaluations.length,
        completedEvaluations: assignedEvaluations.filter(e => e.estado === 'completada').length,
        pendingEvaluations: assignedEvaluations.filter(e => e.estado === 'pendiente').length,
        overdueEvaluations: assignedEvaluations.filter(e => 
          e.estado === 'pendiente' && new Date(e.fecha_limite) < new Date()
        ).length
      };

      res.render('evaluator/dashboard', {
        user,
        stats,
        assignedEvaluations: assignedEvaluations.slice(0, 10),
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in evaluator dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Dashboard Kanban (CORREGIDO)
  async kanbanDashboard(req, res) {
    try {
      const user = req.session.user;
      const areaTrabajoId = req.areaTrabajoId;
      
      // Obtener TAREAS agrupadas por estado filtradas por área de trabajo
      // Solo agregar filtro de área si areaTrabajoId está definido
      const conditions = {};
      if (areaTrabajoId !== undefined && areaTrabajoId !== null) {
        conditions.area_trabajo_id = areaTrabajoId;
      }
      const allTasks = await this.taskModel.findWithDetails(conditions);
      
      const kanbanData = {
        por_hacer: allTasks.filter(t => t.estado === 'pendiente'),
        en_progreso: allTasks.filter(t => t.estado === 'entregado'), 
        completado: allTasks.filter(t => ['aprobado', 'revisado'].includes(t.estado))
      };

      // Obtener proyectos según el rol del usuario, filtrados por área de trabajo
      let userProjects = [];
      const areaFilter = {};
      if (areaTrabajoId !== undefined && areaTrabajoId !== null) {
        areaFilter.area_trabajo_id = areaTrabajoId;
      }
      
      switch (user.rol_nombre) {
        case 'Estudiante':
          userProjects = await this.projectModel.findByStudent(user.id, areaFilter);
          break;
        case 'Director':
          userProjects = await this.projectModel.findByDirector(user.id, areaFilter);
          break;
        case 'Administrador':
        case 'Coordinador':
          userProjects = await this.projectModel.findWithDetails(areaFilter);
          break;
        case 'Evaluador':
          // Los evaluadores pueden ver proyectos que están evaluando
          userProjects = await this.projectModel.findWithDetails(areaFilter);
          break;
        default:
          userProjects = [];
      }

      // Obtener todos los proyectos para estadísticas generales (filtrados por área)
      const allProjects = await this.projectModel.findWithDetails(areaFilter);
      
      // Estadísticas generales
      const stats = {
        totalProjects: allProjects.length,
        totalTasks: allTasks.length,
        por_hacer: kanbanData.por_hacer.length,
        en_progreso: kanbanData.en_progreso.length,
        completado: kanbanData.completado.length,
        totalDeliverables: allTasks.length,
        completedEvaluations: kanbanData.completado.length,
        pendingEvaluations: kanbanData.por_hacer.length,
        // Mantener compatibilidad con la vista actual
        nuevos: allProjects.filter(p => p.estado === 'borrador').length,
        en_desarrollo: allProjects.filter(p => p.estado === 'en_desarrollo').length,
        en_evaluacion: allProjects.filter(p => p.estado === 'en_revision').length,
        completados: allProjects.filter(p => p.estado === 'finalizado').length
      };

      res.render('common/kanban', {
      user,
      kanbanData, // Ahora contiene TAREAS
      stats,
      projects: allProjects, // Lista de proyectos para estadísticas
      userProjects, // Proyectos específicos del usuario para la barra lateral
      success: req.flash('success'),
      error: req.flash('error')
    });
    } catch (error) {
      console.error('Error in kanban dashboard:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Actualizar estado de tarea (drag & drop)
  async updateTaskStatus(req, res) {
    try {
      const { taskId, newStatus } = req.body;

      // Validar entrada
      if (!taskId || !newStatus) {
        return res.status(400).json({
          success: false,
          message: 'taskId y newStatus son requeridos'
        });
      }

      // Mapear estados del frontend a la base de datos
      const statusMap = {
        'por_hacer': 'pendiente',
        'en_progreso': 'entregado', 
        'completado': 'aprobado'
      };

      const dbStatus = statusMap[newStatus];
      if (!dbStatus) {
        return res.status(400).json({
          success: false,
          message: 'Estado no válido'
        });
      }

      // Actualizar en la base de datos
      await this.taskModel.updateStatus(taskId, dbStatus);

      res.json({
        success: true,
        message: 'Estado actualizado correctamente'
      });

    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener una tarea específica
  async getTask(req, res) {
    try {
      const { id } = req.params;
      const task = await this.taskModel.findById(id);
      
      if (!task) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      
      res.json({ success: true, task });
    } catch (error) {
      console.error('Error getting task:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }

  // Crear nueva tarea
  async createTask(req, res) {
    try {
      const { titulo, descripcion, proyecto_id, fase_id, fecha_limite, estado } = req.body;
      const user = req.session.user;
      
      // Validar campos requeridos
      if (!titulo || !fecha_limite) {
        return res.status(400).json({ success: false, message: 'Campos requeridos faltantes' });
      }
      
      const taskData = {
        titulo,
        descripcion: descripcion || '',
        proyecto_id: proyecto_id ? parseInt(proyecto_id) : null,
        fase_id: fase_id ? parseInt(fase_id) : 1, // Valor por defecto
        fecha_limite,
        estado: estado || 'pendiente'
      };
      
      const newTask = await this.taskModel.create(taskData);
      
      // Generar código basado en el ID después de la creación
      const taskWithCode = {
        ...newTask,
        codigo: `TASK-${String(newTask.id).padStart(4, '0')}`
      };
      
      res.json({ success: true, task: taskWithCode });
      
    } catch (error) {
      console.error('Error creating task:', error);
      res.status(500).json({ success: false, message: 'Error al crear la tarea' });
    }
  }

  // Actualizar tarea existente
  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const { titulo, descripcion, proyecto_id, fase_id, fecha_limite, estado } = req.body;
      
      const updateData = {
        titulo,
        descripcion,
        proyecto_id: parseInt(proyecto_id),
        fase_id: parseInt(fase_id),
        fecha_limite,
        estado,
        updated_at: new Date()
      };
      
      const updatedTask = await this.taskModel.update(id, updateData);
      res.json({ success: true, task: updatedTask });
      
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar la tarea' });
    }
  }

  // Eliminar tarea
  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      
      await this.taskModel.delete(id);
      res.json({ success: true, message: 'Tarea eliminada correctamente' });
      
    } catch (error) {
      console.error('Error deleting task:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar la tarea' });
    }
  }

  // Método auxiliar para generar código de tarea
  async generateTaskCode() {
    try {
      const prefix = 'TSK';
      let isUnique = false;
      let codigo;
      
      while (!isUnique) {
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        codigo = `${prefix}${randomNum}`;
        
        const existingTask = await this.taskModel.findOne({ codigo });
        if (!existingTask) {
          isUnique = true;
        }
      }
      
      return codigo;
    } catch (error) {
      throw new Error(`Error generating task code: ${error.message}`);
    }
  }

  // Obtener notificaciones del usuario
  async getNotifications(req, res) {
    try {
      const userId = req.session.user.id;
      const notifications = await this.notificationModel.getUnreadForUser(userId);
      const stats = await this.notificationModel.getStatsForUser(userId);
      
      res.json({
        success: true,
        notifications,
        stats
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener notificaciones'
      });
    }
  }

  // Marcar notificación como leída
  async markNotificationAsRead(req, res) {
    try {
      const { id } = req.params;
      const success = await this.notificationModel.markAsRead(id);
      
      res.json({
        success,
        message: success ? 'Notificación marcada como leída' : 'Error al marcar notificación'
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar notificación como leída'
      });
    }
  }

  // Marcar todas las notificaciones como leídas
  async markAllNotificationsAsRead(req, res) {
    try {
      const userId = req.session.user.id;
      const count = await this.notificationModel.markAllAsReadForUser(userId);
      
      res.json({
        success: true,
        message: `${count} notificaciones marcadas como leídas`
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        message: 'Error al marcar todas las notificaciones como leídas'
      });
    }
  }

  // Asignar tarea a usuario
  async assignTaskToUser(req, res) {
    try {
      const { taskId, userId } = req.body;
      const assignedBy = req.session.user.id;
      
      const success = await this.taskModel.assignToUser(taskId, userId, assignedBy);
      
      if (success) {
        res.json({
          success: true,
          message: 'Tarea asignada correctamente'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Error al asignar la tarea'
        });
      }
    } catch (error) {
      console.error('Error assigning task to user:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Asignar tarea a rol
  async assignTaskToRole(req, res) {
    try {
      const { taskId, roleId } = req.body;
      const assignedBy = req.session.user.id;
      
      const assignments = await this.taskModel.assignToRole(taskId, roleId, assignedBy);
      
      res.json({
        success: true,
        message: `Tarea asignada a ${assignments.length} usuarios`,
        assignments
      });
    } catch (error) {
      console.error('Error assigning task to role:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener tareas asignadas al usuario actual
  async getMyAssignedTasks(req, res) {
    try {
      const userId = req.session.user.id;
      const tasks = await this.taskModel.getAssignedToUser(userId);
      
      res.json({
        success: true,
        tasks
      });
    } catch (error) {
      console.error('Error getting assigned tasks:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener tareas asignadas'
      });
    }
  }

  // Actualizar estado de tarea con notificación
  async updateTaskStatus(req, res) {
    try {
      const { taskId, newStatus } = req.body;
      const changedBy = req.session.user.id;
      
      const success = await this.taskModel.updateStatus(taskId, newStatus, changedBy);
      
      if (success) {
        res.json({
          success: true,
          message: 'Estado de tarea actualizado correctamente'
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Error al actualizar el estado de la tarea'
        });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
  
  // Obtener todas las tareas para el calendario
  async getAllTasks(req, res) {
    try {
      const allTasks = await this.taskModel.findWithDetails();
      
      // Formatear las tareas para el calendario
      const formattedTasks = allTasks.map(task => {
        // Convertir fecha_limite a string si es un objeto Date
        let fechaString = '';
        if (task.fecha_limite) {
          if (task.fecha_limite instanceof Date) {
            fechaString = task.fecha_limite.toISOString().slice(0, 19).replace('T', ' ');
          } else if (typeof task.fecha_limite === 'string') {
            fechaString = task.fecha_limite;
          }
        }
        
        return {
          id: task.id,
          codigo: `TASK-${String(task.id).padStart(4, '0')}`,
          titulo: task.titulo,
          descripcion: task.descripcion || '',
          fecha_limite: task.fecha_limite,
          estado: task.estado,
          proyecto_id: task.proyecto_id,
          fase_id: task.fase_id,
          proyecto_nombre: task.proyecto_nombre || 'Sin proyecto',
          // Mapear campos para el calendario
          title: task.titulo,
          description: task.descripcion || '',
          date: fechaString ? fechaString.split(' ')[0] : null,
          time: fechaString ? (fechaString.split(' ')[1] || '09:00') : '09:00',
          priority: this.mapPriority(task.estado),
          type: 'Tarea',
          project: task.proyecto_nombre || 'Sin proyecto'
        };
      });
      
      res.json({ success: true, tasks: formattedTasks });
      
    } catch (error) {
      console.error('Error getting all tasks:', error);
      res.status(500).json({ success: false, message: 'Error al obtener las tareas' });
    }
  }
  
  // Método auxiliar para mapear prioridades
  mapPriority(estado) {
    switch (estado) {
      case 'pendiente': return 'Alta';
      case 'entregado': return 'Media';
      case 'aprobado': return 'Baja';
      case 'revisado': return 'Informativa';
      default: return 'Media';
    }
  }

  // ========== MÉTODOS ESPECÍFICOS PARA ESTUDIANTES ==========

  // Vista de proyectos del estudiante
  async studentProjects(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener proyectos donde el estudiante es miembro y que estén en su área de trabajo
      let myProjects = [];
      
      if (req.areaTrabajoId) {
        // Obtener proyectos del área de trabajo donde el usuario es miembro
        myProjects = await this.projectModel.findStudentProjectsByArea(user.id, req.areaTrabajoId);
      } else {
        // Si no tiene área asignada, obtener proyectos donde es miembro (sin filtro de área)
        myProjects = await this.projectModel.findStudentProjects(user.id);
      }
      
      res.render('student/projects', {
        user,
        myProjects: myProjects || [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in studentProjects:', error);
      req.flash('error', 'Error al cargar los proyectos');
      res.redirect('/dashboard/student');
    }
  }

  // Vista de entregables del estudiante
  async studentDeliverables(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener entregables del estudiante
      const myDeliverables = await this.deliverableModel.findByStudent(user.id);
      
      res.render('student/deliverables', {
        user,
        myDeliverables: myDeliverables || [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in studentDeliverables:', error);
      req.flash('error', 'Error al cargar los entregables');
      res.redirect('/dashboard/student');
    }
  }

  // Vista de evaluaciones del estudiante
  async studentEvaluations(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener evaluaciones del estudiante
      const myEvaluations = await this.evaluationModel.findByStudent(user.id);
      
      res.render('student/evaluations', {
        user,
        myEvaluations: myEvaluations || [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in studentEvaluations:', error);
      req.flash('error', 'Error al cargar las evaluaciones');
      res.redirect('/dashboard/student');
    }
  }

  // Vista de perfil del estudiante
  async studentProfile(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener información completa del usuario
      const userDetails = await this.userModel.findById(user.id);
      
      res.render('student/profile', {
        user: userDetails || user,
        userDetails: userDetails || user,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in studentProfile:', error);
      req.flash('error', 'Error al cargar el perfil');
      res.redirect('/dashboard/student');
    }
  }

  // Subir entregable
  async uploadDeliverable(req, res) {
    try {
      const user = req.session.user;
      const { deliverable_id, content } = req.body;
      
      console.log('📤 Upload deliverable request:', {
        user: user?.email,
        deliverable_id,
        content: content?.substring(0, 100) + '...',
        files: req.files?.length || 0
      });

      // Validar que se proporcione al menos contenido o archivos
      if ((!content || content.trim().length < 10) && (!req.files || req.files.length === 0)) {
        return res.status(400).json({
          success: false,
          message: 'Debes proporcionar contenido (mínimo 10 caracteres) o al menos un archivo'
        });
      }

      // Verificar que el entregable existe
      if (!deliverable_id) {
        return res.status(400).json({
          success: false,
          message: 'ID de entregable requerido'
        });
      }

      const deliverable = await this.deliverableModel.findById(deliverable_id);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Preparar datos de actualización
      const updateData = {
        estado: 'entregado',
        fecha_entrega: new Date(),
        asignado_a: user.id
      };

      // Agregar contenido si se proporciona
      if (content && content.trim().length > 0) {
        updateData.descripcion = content.trim();
      }

      // Manejar archivos adjuntos
      if (req.files && req.files.length > 0) {
        const fileUrls = req.files.map(file => `/uploads/deliverables/${file.filename}`);
        
        updateData.archivo_url = fileUrls.join(',');
      }

      // Actualizar en la base de datos
      await this.deliverableModel.update(deliverable_id, updateData);
      
      console.log('✅ Deliverable updated successfully');
      
      res.json({
        success: true,
        message: 'Entregable enviado exitosamente'
      });
      
    } catch (error) {
      console.error('❌ Error in uploadDeliverable:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor al enviar el entregable'
      });
    }
  }

  // Actualizar perfil del estudiante
  async updateStudentProfile(req, res) {
    try {
      console.log('🔄 updateStudentProfile - Petición recibida');
      console.log('📝 Body recibido:', req.body);
      console.log('👤 Usuario en sesión:', req.session.user?.email);
      
      const user = req.session.user;
      const { nombres, apellidos, email, telefono, fecha_nacimiento } = req.body;
      
      // Validar campos requeridos
      if (!nombres || !apellidos || !email) {
        return res.json({
          success: false,
          message: 'Nombres, apellidos y email son campos obligatorios'
        });
      }
      
      // Preparar datos para actualizar
      const updateData = {
        nombres,
        apellidos,
        email,
        telefono
      };
      
      // Agregar fecha_nacimiento solo si se proporciona
      if (fecha_nacimiento) {
        updateData.fecha_nacimiento = fecha_nacimiento;
      }
      
      // Actualizar información del usuario
      await this.userModel.update(user.id, updateData);
      
      // Actualizar sesión
      req.session.user = { ...user, nombres, apellidos, email, telefono, fecha_nacimiento };
      
      res.json({
        success: true,
        message: 'Perfil actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error in updateStudentProfile:', error);
      res.json({
        success: false,
        message: 'Error al actualizar el perfil'
      });
    }
  }

  // Cambiar contraseña del estudiante
  async changeStudentPassword(req, res) {
    try {
      console.log('🔄 Iniciando cambio de contraseña...');
      console.log('📝 Body recibido:', req.body);
      
      const user = req.session.user;
      const { current_password, new_password, confirm_password } = req.body;

      // Validar que se proporcionen todos los campos
      if (!current_password || !new_password || !confirm_password) {
        return res.json({
          success: false,
          message: 'Todos los campos son obligatorios'
        });
      }

      // Validar que las nuevas contraseñas coincidan
      if (new_password !== confirm_password) {
        return res.json({
          success: false,
          message: 'Las contraseñas nuevas no coinciden'
        });
      }

      // Validar longitud mínima de la nueva contraseña
      if (new_password.length < 6) {
        return res.json({
          success: false,
          message: 'La nueva contraseña debe tener al menos 6 caracteres'
        });
      }

      // Obtener información completa del usuario
      const userDetails = await this.userModel.findById(user.id);
      console.log('👤 UserDetails obtenido:', userDetails ? 'Sí' : 'No');
      console.log('🔑 Password_hash field exists:', userDetails && userDetails.password_hash ? 'Sí' : 'No');
      console.log('🔑 Password_hash length:', userDetails && userDetails.password_hash ? userDetails.password_hash.length : 'N/A');
      console.log('📝 Current password received:', current_password ? 'Sí' : 'No');
      
      if (!userDetails) {
        return res.json({
          success: false,
          message: 'Usuario no encontrado'
        });
      }

      if (!userDetails.password_hash) {
        console.log('❌ Error: userDetails.password_hash es null/undefined');
        return res.json({
          success: false,
          message: 'Error interno: contraseña no encontrada'
        });
      }

      // Verificar la contraseña actual
      const bcrypt = require('bcrypt');
      console.log('🔍 Comparando contraseñas...');
      const isCurrentPasswordValid = await bcrypt.compare(current_password, userDetails.password_hash);
      
      if (!isCurrentPasswordValid) {
        return res.json({
          success: false,
          message: 'La contraseña actual es incorrecta'
        });
      }

      // Verificar que la nueva contraseña sea diferente a la actual
      const isSamePassword = await bcrypt.compare(new_password, userDetails.password_hash);
      if (isSamePassword) {
        return res.json({
          success: false,
          message: 'La nueva contraseña debe ser diferente a la actual'
        });
      }

      // Encriptar la nueva contraseña
      const hashedNewPassword = await bcrypt.hash(new_password, 10);

      // Actualizar la contraseña en la base de datos
      await this.userModel.update(user.id, {
        password_hash: hashedNewPassword
      });

      console.log('✅ Contraseña actualizada exitosamente en la base de datos');

      // Respuesta exitosa
      res.json({
        success: true,
        message: 'Contraseña cambiada exitosamente'
      });

    } catch (error) {
      console.error('Error in changeStudentPassword:', error);
      res.json({
        success: false,
        message: 'Error interno del servidor al cambiar la contraseña'
      });
    }
  }

  // Actualizar información adicional del estudiante
  async updateAdditionalInfo(req, res) {
    try {
      const user = req.session.user;
      const { biografia } = req.body;

      console.log('📝 Actualizando información adicional para usuario:', user.id);
      console.log('📄 Nueva biografía:', biografia);

      // Validar que el usuario esté autenticado
      if (!user || !user.id) {
        return res.json({
          success: false,
          message: 'Usuario no autenticado'
        });
      }

      // Validar entrada
      if (biografia === undefined || biografia === null) {
        return res.json({
          success: false,
          message: 'La biografía es requerida'
        });
      }

      // Actualizar información adicional en la base de datos
      await this.userModel.update(user.id, { biografia: biografia });

      console.log('✅ Información adicional actualizada exitosamente en la base de datos');

      res.json({
        success: true,
        message: 'Información adicional actualizada exitosamente'
      });

    } catch (error) {
      console.error('Error in updateAdditionalInfo:', error);
      res.json({
        success: false,
        message: 'Error interno del servidor al actualizar la información adicional'
      });
    }
  }

  // ===== MÉTODOS PARA COORDINADOR =====
  
  async coordinatorProjects(req, res) {
    try {
      const user = req.session.user;
      const projectController = new (require('./ProjectController'))();
      
      const projects = await projectController.getProjectsByCoordinator(user.id);
      
      res.render('coordinator/projects', {
        title: 'Mis Proyectos Asignados',
        user: user,
        projects: projects || []
      });
    } catch (error) {
      console.error('Error loading coordinator projects:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar los proyectos',
        error: error 
      });
    }
  }

  async coordinatorStudents(req, res) {
    try {
      const user = req.session.user;
      
      // Primero obtenemos el área de trabajo del coordinador
      const [coordinatorData] = await pool.execute(
        'SELECT area_trabajo_id FROM usuarios WHERE id = ?',
        [user.id]
      );
      
      if (!coordinatorData.length || !coordinatorData[0].area_trabajo_id) {
        return res.render('coordinator/students', {
          title: 'Estudiantes Asignados',
          user: user,
          students: []
        });
      }
      
      const areaTrabajoId = coordinatorData[0].area_trabajo_id;
      
      // Obtener estudiantes de proyectos del área de trabajo
      const query = `
        SELECT DISTINCT 
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          u.telefono,
          u.created_at as fecha_registro,
          p.titulo as proyecto_titulo,
          p.id as proyecto_id,
          p.estado as proyecto_estado
        FROM usuarios u
        INNER JOIN proyectos p ON u.id = p.estudiante_id
        WHERE p.area_trabajo_id = ?
        ORDER BY u.apellidos, u.nombres
      `;
      
      const [students] = await pool.execute(query, [areaTrabajoId]);
      
      res.render('coordinator/students', {
        title: 'Estudiantes Asignados',
        user: user,
        students: students
      });
    } catch (error) {
      console.error('Error loading coordinator students:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar los estudiantes',
        error: error 
      });
    }
  }

  async coordinatorEvaluations(req, res) {
    try {
      const user = req.session.user;
      
      // Primero obtenemos el área de trabajo del coordinador
      const [coordinatorData] = await pool.execute(
        'SELECT area_trabajo_id FROM usuarios WHERE id = ?',
        [user.id]
      );
      
      if (!coordinatorData.length || !coordinatorData[0].area_trabajo_id) {
        return res.render('coordinator/evaluations', {
          title: 'Evaluaciones de Proyectos',
          user: user,
          evaluations: []
        });
      }
      
      const areaTrabajoId = coordinatorData[0].area_trabajo_id;
      
      // Obtener evaluaciones de proyectos del área de trabajo
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          d.titulo as entregable_titulo
        FROM evaluaciones e
        INNER JOIN proyectos p ON e.proyecto_id = p.id
        INNER JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN entregables d ON e.entregable_id = d.id
        WHERE p.area_trabajo_id = ?
        ORDER BY e.fecha_evaluacion DESC
      `;
      
      const [evaluations] = await pool.execute(query, [areaTrabajoId]);
      
      res.render('coordinator/evaluations', {
        title: 'Evaluaciones de Proyectos',
        user: user,
        evaluations: evaluations
      });
    } catch (error) {
      console.error('Error loading coordinator evaluations:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar las evaluaciones',
        error: error 
      });
    }
  }

  async coordinatorReports(req, res) {
    try {
      const user = req.session.user;
      
      // Primero obtenemos el área de trabajo del coordinador
      const [coordinatorData] = await pool.execute(
        'SELECT area_trabajo_id FROM usuarios WHERE id = ?',
        [user.id]
      );
      
      if (!coordinatorData.length || !coordinatorData[0].area_trabajo_id) {
        return res.render('coordinator/reports', {
          title: 'Reportes y Estadísticas',
          user: user,
          stats: { total_proyectos: 0, proyectos_activos: 0, proyectos_completados: 0, proyectos_pausados: 0 },
          averageProgress: 0,
          projects: []
        });
      }
      
      const areaTrabajoId = coordinatorData[0].area_trabajo_id;
      
      // Obtener estadísticas de proyectos del área de trabajo
      const statsQuery = `
        SELECT 
          COUNT(*) as total_proyectos,
          COUNT(CASE WHEN estado = 'activo' THEN 1 END) as proyectos_activos,
          COUNT(CASE WHEN estado = 'completado' THEN 1 END) as proyectos_completados,
          COUNT(CASE WHEN estado = 'pausado' THEN 1 END) as proyectos_pausados
        FROM proyectos 
        WHERE area_trabajo_id = ?
      `;
      
      const [stats] = await pool.execute(statsQuery, [areaTrabajoId]);
      
      // Obtener progreso promedio
      const progressQuery = `
        SELECT 
          p.id,
          p.titulo,
          COUNT(d.id) as total_entregables,
          COUNT(CASE WHEN d.estado = 'completado' THEN 1 END) as entregables_completados
        FROM proyectos p
        LEFT JOIN entregables d ON p.id = d.proyecto_id
        WHERE p.area_trabajo_id = ?
        GROUP BY p.id
      `;
      
      const [projects] = await pool.execute(progressQuery, [areaTrabajoId]);
      
      // Calcular progreso promedio
      let totalProgress = 0;
      projects.forEach(project => {
        const progress = project.total_entregables > 0 
          ? (project.entregables_completados / project.total_entregables) * 100
          : 0;
        totalProgress += progress;
      });
      
      const averageProgress = projects.length > 0 ? totalProgress / projects.length : 0;
      
      res.render('coordinator/reports', {
        title: 'Reportes y Estadísticas',
        user: user,
        stats: stats[0],
        averageProgress: Math.round(averageProgress),
        projects: projects
      });
    } catch (error) {
      console.error('Error loading coordinator reports:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar los reportes',
        error: error 
      });
    }
  }

  async coordinatorCalendar(req, res) {
    try {
      const user = req.session.user;
      
      // Primero obtenemos el área de trabajo del coordinador
      const [coordinatorData] = await pool.execute(
        'SELECT area_trabajo_id FROM usuarios WHERE id = ?',
        [user.id]
      );
      
      if (!coordinatorData.length || !coordinatorData[0].area_trabajo_id) {
        return res.render('coordinator/calendar', {
          title: 'Calendario de Entregables',
          user: user,
          deliverables: []
        });
      }
      
      const areaTrabajoId = coordinatorData[0].area_trabajo_id;
      
      // Obtener entregables próximos de proyectos del área de trabajo
      const query = `
        SELECT 
          d.id,
          d.titulo,
          d.descripcion,
          d.fecha_entrega,
          d.estado,
          p.titulo as proyecto_titulo,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos
        FROM entregables d
        INNER JOIN proyectos p ON d.proyecto_id = p.id
        INNER JOIN usuarios u ON p.estudiante_id = u.id
        WHERE p.area_trabajo_id = ?
        ORDER BY d.fecha_entrega ASC
        LIMIT 20
      `;
      
      const [deliverables] = await pool.execute(query, [areaTrabajoId]);
      
      res.render('coordinator/calendar', {
        title: 'Calendario de Entregables',
        user: user,
        deliverables: deliverables || []
      });
    } catch (error) {
      console.error('Error loading coordinator calendar:', error);
      res.status(500).render('error', { 
        message: 'Error al cargar el calendario',
        error: error 
      });
    }
  }
}

module.exports = DashboardController;