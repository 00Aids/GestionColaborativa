const Entregable = require('../models/Entregable');
const Project = require('../models/Project');
const User = require('../models/User');
const AreaTrabajo = require('../models/AreaTrabajo');
const DeliverableNotificationService = require('../services/DeliverableNotificationService');

class EntregableController {
  constructor() {
    this.entregableModel = new Entregable();
    this.projectModel = new Project();
    this.userModel = new User();
    this.areaTrabajoModel = new AreaTrabajo();
    this.notificationService = new DeliverableNotificationService();
  }

  // Vista de revisión de entregables para coordinador
  async coordinatorReview(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener el área de trabajo del coordinador (si existe)
      const userAreas = await this.userModel.getUserAreas(user.id);
      const areaTrabajoId = (userAreas && userAreas.length > 0) ? userAreas[0].area_trabajo_id : null;
      
      // Obtener entregables de proyectos asignados al coordinador
      const deliverables = await this.entregableModel.findByCoordinatorForReview(user.id);
      
      // Calcular estadísticas del workflow
      let areaStats;
      if (areaTrabajoId) {
        areaStats = await this.entregableModel.getWorkflowSummary(areaTrabajoId);
      } else {
        // Fallback: calcular estadísticas basadas en los entregables del coordinador
        const now = new Date();
        areaStats = {
          total: deliverables.length,
          pendientes: deliverables.filter(d => d.estado === 'pendiente').length,
          en_progreso: deliverables.filter(d => d.estado === 'en_progreso').length,
          entregados: deliverables.filter(d => d.estado === 'entregado').length,
          aprobados: deliverables.filter(d => ['aprobado','aceptado'].includes(d.estado)).length,
          requiere_cambios: deliverables.filter(d => d.estado === 'requiere_cambios').length,
          vencidos: deliverables.filter(d => {
            if (!d.fecha_limite) return false;
            const limite = new Date(d.fecha_limite);
            return limite < now && !['aprobado','aceptado','completado','rechazado'].includes(d.estado);
          }).length
        };
      }
      
      // Organizar entregables por estado
      const deliverablesByStatus = {
        entregado: deliverables.filter(d => d.estado === 'entregado'),
        en_revision: deliverables.filter(d => d.estado === 'en_revision'),
        requiere_cambios: deliverables.filter(d => d.estado === 'requiere_cambios'),
        rechazado: deliverables.filter(d => d.estado === 'rechazado'),
        aceptado: deliverables.filter(d => d.estado === 'aceptado')
      };

      res.render('coordinator/deliverable-review', {
        title: 'Revisión de Entregables',
        user,
        deliverables,
        deliverablesByStatus,
        areaStats,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in coordinatorReview:', error);
      req.flash('error', 'Error al cargar los entregables para revisión');
      res.redirect('/dashboard/coordinator');
    }
  }

  // Actualizar estado de entregable (aprobar/rechazar/solicitar cambios)
  async updateDeliverableStatus(req, res) {
    try {
      const { deliverableId } = req.params;
      const { action, observaciones } = req.body;
      const user = req.session.user;

      // Verificar que el entregable existe
      const deliverable = await this.entregableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Obtener información del proyecto para verificar permisos
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar que el coordinador tiene acceso al área del proyecto
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAccess = userAreas.some(area => area.area_trabajo_id === project.area_trabajo_id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para revisar este entregable'
        });
      }

      // VALIDACIÓN: Prevenir calificación de entregables no enviados
      if (deliverable.estado === 'pendiente' && ['approve', 'reject', 'request_changes'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: 'No se puede calificar un entregable que no ha sido enviado por el estudiante'
        });
      }

      // VALIDACIÓN: Prevenir acciones en entregables ya finalizados
      const finalStates = ['aceptado', 'rechazado', 'completado'];
      if (finalStates.includes(deliverable.estado)) {
        return res.status(400).json({
          success: false,
          message: `No se pueden realizar acciones en un entregable que ya está ${deliverable.estado}`
        });
      }

      // VALIDACIÓN: Solo permitir iniciar revisión si el entregable está entregado o requiere cambios
      if (action === 'start_review' && !['entregado', 'requiere_cambios'].includes(deliverable.estado)) {
        return res.status(400).json({
          success: false,
          message: 'Solo se puede iniciar la revisión de entregables que han sido enviados o que requieren cambios'
        });
      }

      // VALIDACIÓN: Solo permitir aprobar/rechazar/solicitar cambios si está en revisión
      if (['approve', 'reject', 'request_changes'].includes(action) && deliverable.estado !== 'en_revision') {
        return res.status(400).json({
          success: false,
          message: 'Solo se pueden aprobar, rechazar o solicitar cambios a entregables que están en revisión'
        });
      }

      // Determinar el nuevo estado basado en la acción
      let newStatus;
      let message;
      
      switch (action) {
        case 'approve':
          newStatus = 'aceptado';
          message = 'Entregable aprobado exitosamente';
          break;
        case 'reject':
          newStatus = 'rechazado';
          message = 'Entregable rechazado';
          break;
        case 'request_changes':
          newStatus = 'requiere_cambios';
          message = 'Se han solicitado cambios al entregable';
          break;
        case 'start_review':
          newStatus = 'en_revision';
          message = 'Entregable marcado como en revisión';
          break;
        default:
          return res.status(400).json({
            success: false,
            message: 'Acción no válida'
          });
      }

      // Actualizar el estado usando el workflow
      await this.entregableModel.updateStatusWithWorkflow(
        deliverableId, 
        newStatus, 
        observaciones, 
        user.id
      );

      // Enviar notificaciones automáticas
      try {
        const deliverableDetails = await this.entregableModel.findByIdWithDetails(deliverableId);
        
        switch (action) {
          case 'approve':
            await this.notificationService.notifyDeliverableApproved(
              deliverableId, 
              deliverableDetails, 
              user.id
            );
            break;
          case 'reject':
            await this.notificationService.notifyDeliverableRejected(
              deliverableId, 
              deliverableDetails, 
              user.id, 
              observaciones
            );
            break;
          case 'request_changes':
            await this.notificationService.notifyDeliverableNeedsChanges(
              deliverableId, 
              deliverableDetails, 
              user.id, 
              observaciones
            );
            break;
        }
      } catch (notificationError) {
        console.error('Error sending notification:', notificationError);
        // No fallar la operación principal por errores de notificación
      }

      res.json({
        success: true,
        message,
        newStatus
      });

    } catch (error) {
      console.error('Error updating deliverable status:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener detalles de un entregable para revisión
  async getDeliverableDetails(req, res) {
    try {
      const { deliverableId } = req.params;
      const user = req.session.user;

      // Obtener entregable con detalles
      const deliverable = await this.entregableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Obtener información del proyecto primero para verificar permisos
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar acceso: por área o por membresía activa en el proyecto
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAreaAccess = userAreas.some(area => area.area_trabajo_id === project.area_trabajo_id) || user.area_trabajo_id === project.area_trabajo_id;
      const isProjectMember = await this.projectModel.findProjectMember(deliverable.proyecto_id, user.id);
      const hasAccess = hasAreaAccess || !!isProjectMember;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este entregable'
        });
      }

      // Obtener información adicional
      const comments = await this.entregableModel.getComments(deliverableId);
      
      // Calcular días restantes
      const today = new Date();
      const dueDate = new Date(deliverable.fecha_limite);
      const diffTime = dueDate - today;
      const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      res.json({
        success: true,
        deliverable: {
          ...deliverable,
          project,
          comments,
          diasRestantes,
          isOverdue: diasRestantes < 0
        }
      });

    } catch (error) {
      console.error('Error getting deliverable details:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Obtener entregable por ID (método usado en rutas)
  async getDeliverableById(req, res) {
    try {
      const { deliverableId } = req.params;
      const user = req.session.user;

      // Obtener entregable con detalles
      const deliverable = await this.entregableModel.findByIdWithDetails(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar acceso usando el area_trabajo_id del proyecto
      // Primero obtenemos el proyecto para verificar permisos
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAreaAccess = userAreas.some(area => area.area_trabajo_id === project.area_trabajo_id) || user.area_trabajo_id === project.area_trabajo_id;
      const isProjectMember = await this.projectModel.findProjectMember(deliverable.proyecto_id, user.id);
      const hasAccess = hasAreaAccess || !!isProjectMember;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este entregable'
        });
      }

      res.json({
        success: true,
        deliverable
      });

    } catch (error) {
      console.error('Error getting deliverable by ID:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Actualizar estado de entregable (método simple)
  async updateStatus(req, res) {
    try {
      const { deliverableId } = req.params;
      const { estado, observaciones } = req.body;
      const user = req.session.user;

      // Verificar que el entregable existe
      const deliverable = await this.entregableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Obtener información del proyecto para verificar permisos
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      if (!project) {
        return res.status(404).json({
          success: false,
          message: 'Proyecto no encontrado'
        });
      }

      // Verificar acceso: por área o por membresía activa en el proyecto
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAreaAccess = userAreas.some(area => area.area_trabajo_id === project.area_trabajo_id) || user.area_trabajo_id === project.area_trabajo_id;
      const isProjectMember = await this.projectModel.findProjectMember(deliverable.proyecto_id, user.id);
      const hasAccess = hasAreaAccess || !!isProjectMember;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para actualizar este entregable'
        });
      }

      // Actualizar el estado usando el workflow
      await this.entregableModel.updateStatusWithWorkflow(
        deliverableId, 
        estado, 
        observaciones, 
        user.id
      );

      res.json({
        success: true,
        message: 'Estado actualizado exitosamente',
        newStatus: estado
      });

    } catch (error) {
      console.error('Error updating status:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Agregar comentario a un entregable
  async addComment(req, res) {
    try {
      const { deliverableId } = req.params;
      const { comentario, tipo } = req.body;
      const user = req.session.user;

      if (!comentario || comentario.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El comentario no puede estar vacío'
        });
      }

      // Verificar que el entregable existe y el usuario tiene acceso
      const deliverable = await this.entregableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar acceso: por área del proyecto o por membresía activa en el proyecto
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      const userAreas = await this.userModel.getUserAreas(user.id);
      const targetAreaId = project ? project.area_trabajo_id : deliverable.area_trabajo_id;
      const hasAreaAccess = userAreas.some(area => area.area_trabajo_id === targetAreaId) || user.area_trabajo_id === targetAreaId;
      const isProjectMember = await this.projectModel.findProjectMember(deliverable.proyecto_id, user.id);
      const hasAccess = hasAreaAccess || !!isProjectMember;
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para comentar este entregable'
        });
      }

      // Agregar el comentario
      const commentId = await this.entregableModel.addComment(
        deliverableId,
        user.id,
        comentario.trim(),
        tipo || 'revision'
      );

      // Enviar notificación automática
      try {
        const deliverableDetails = await this.entregableModel.findByIdWithDetails(deliverableId);
        const commentData = {
          autor_nombre: `${user.nombre} ${user.apellido}`,
          comentario: comentario.trim()
        };
        
        await this.notificationService.notifyDeliverableComment(
          deliverableId,
          deliverableDetails,
          commentData
        );
      } catch (notificationError) {
        console.error('Error sending comment notification:', notificationError);
        // No fallar la operación principal por errores de notificación
      }

      res.json({
        success: true,
        message: 'Comentario agregado exitosamente',
        commentId
      });

    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Mostrar detalles del entregable en vista HTML (para coordinadores)
  async showDeliverableDetails(req, res) {
    try {
      const { deliverableId } = req.params;
      const user = req.session.user;

      // Obtener entregable con detalles completos incluyendo archivos procesados
      const deliverable = await this.entregableModel.findByIdWithDetails(deliverableId);
      if (!deliverable) {
        req.flash('error', 'Entregable no encontrado');
        return res.redirect('/coordinator/deliverables');
      }

      // DEBUG: Log para verificar qué archivos se están procesando
      console.log('🔍 DEBUG - Datos del entregable:', {
        id: deliverable.id,
        titulo: deliverable.titulo,
        archivos_originales: deliverable.archivos_originales,
        archivos_entregados: deliverable.archivos_entregados
      });
      
      console.log('🔍 DEBUG - Datos RAW de la BD:', {
        archivo_url: deliverable.archivo_url,
        archivos_adjuntos: deliverable.archivos_adjuntos
      });

      // Obtener información del proyecto primero para verificar permisos
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      if (!project) {
        req.flash('error', 'Proyecto no encontrado');
        return res.redirect('/coordinator/deliverables');
      }

      // Verificar acceso: por área o por membresía activa en el proyecto
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAreaAccess = userAreas.some(area => area.area_trabajo_id === project.area_trabajo_id) || user.area_trabajo_id === project.area_trabajo_id;
      const isProjectMember = await this.projectModel.findProjectMember(deliverable.proyecto_id, user.id);
      const hasAccess = hasAreaAccess || !!isProjectMember;
      
      if (!hasAccess) {
        req.flash('error', 'No tienes permisos para ver este entregable');
        return res.redirect('/coordinator/deliverables');
      }

      // Obtener información adicional
      const comments = await this.entregableModel.getComments(deliverableId);
      
      // Calcular días restantes
      const today = new Date();
      const dueDate = new Date(deliverable.fecha_limite);
      const diffTime = dueDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const deliverableWithDetails = {
        ...deliverable,
        project,
        comments,
        diasRestantes: diffDays,
        isOverdue: diffDays < 0 && deliverable.estado === 'pendiente'
      };

      res.render('coordinator/deliverable-detail', {
        title: `Entregable: ${deliverable.titulo}`,
        user,
        deliverable: deliverableWithDetails,
        success: req.flash('success'),
        error: req.flash('error')
      });

    } catch (error) {
      console.error('Error showing deliverable details:', error);
      req.flash('error', 'Error al cargar los detalles del entregable');
      res.redirect('/coordinator/deliverables');
    }
  }
}

module.exports = EntregableController;