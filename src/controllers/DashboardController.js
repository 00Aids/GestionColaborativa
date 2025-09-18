const User = require('../models/User');
const Project = require('../models/Project');
const Deliverable = require('../models/Deliverable');
const Evaluation = require('../models/Evaluation');
const Task = require('../models/Task');
const Notification = require('../models/Notification');

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
      
      // Obtener estadísticas del sistema
      const [projectStats, deliverableStats, evaluationStats] = await Promise.all([
        this.projectModel.getStatistics(),
        this.deliverableModel.getStatistics(),
        this.evaluationModel.getStatistics()
      ]);
  
      // Entregables vencidos
      const overdueDeliverables = await this.deliverableModel.findOverdue();
  
      res.render('coordinator/dashboard', {
        user,
        projectStats,
        deliverableStats,
        evaluationStats,
        overdueDeliverables: overdueDeliverables || [],
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
      
      // Obtener proyectos del estudiante
      const myProjects = await this.projectModel.findByStudent(user.id);
      
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
      const allTasks = await this.taskModel.findWithDetails({ area_trabajo_id: areaTrabajoId });
      
      const kanbanData = {
        por_hacer: allTasks.filter(t => t.estado === 'pendiente'),
        en_progreso: allTasks.filter(t => t.estado === 'entregado'), 
        completado: allTasks.filter(t => ['aprobado', 'revisado'].includes(t.estado))
      };

      // Obtener proyectos según el rol del usuario, filtrados por área de trabajo
      let userProjects = [];
      const areaFilter = { area_trabajo_id: areaTrabajoId };
      
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
}

module.exports = DashboardController;