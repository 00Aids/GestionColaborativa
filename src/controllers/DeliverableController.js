const Deliverable = require('../models/Deliverable');
const Project = require('../models/Project');
const User = require('../models/User');
const AreaTrabajo = require('../models/AreaTrabajo');
const DeliverableNotificationService = require('../services/DeliverableNotificationService');

class DeliverableController {
  constructor() {
    this.deliverableModel = new Deliverable();
    this.projectModel = new Project();
    this.userModel = new User();
    this.areaTrabajoModel = new AreaTrabajo();
    this.notificationService = new DeliverableNotificationService();
  }

  // Vista de revisión de entregables para coordinador
  async coordinatorReview(req, res) {
    try {
      const user = req.session.user;
      
      // Obtener el área de trabajo del coordinador
      const userAreas = await this.userModel.getUserAreas(user.id);
      if (!userAreas || userAreas.length === 0) {
        req.flash('error', 'No tienes un área de trabajo asignada');
        return res.redirect('/dashboard/coordinator');
      }

      const areaTrabajoId = userAreas[0].area_trabajo_id;
      
      // Obtener entregables que requieren revisión en el área del coordinador
      const deliverables = await this.deliverableModel.findByAreaForReview(areaTrabajoId);
      
      // Obtener estadísticas del área
      const areaStats = await this.deliverableModel.getWorkflowSummary(areaTrabajoId);
      
      // Organizar entregables por estado
      const deliverablesByStatus = {
        entregado: deliverables.filter(d => d.estado === 'entregado'),
        en_revision: deliverables.filter(d => d.estado === 'en_revision'),
        requiere_cambios: deliverables.filter(d => d.estado === 'requiere_cambios')
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
      const deliverable = await this.deliverableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar que el coordinador tiene acceso al área del entregable
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAccess = userAreas.some(area => area.area_trabajo_id === deliverable.area_trabajo_id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para revisar este entregable'
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
      await this.deliverableModel.updateStatusWithWorkflow(
        deliverableId, 
        newStatus, 
        observaciones, 
        user.id
      );

      // Enviar notificaciones automáticas
      try {
        const deliverableDetails = await this.deliverableModel.findByIdWithDetails(deliverableId);
        
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
      const deliverable = await this.deliverableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar acceso
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAccess = userAreas.some(area => area.area_trabajo_id === deliverable.area_trabajo_id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para ver este entregable'
        });
      }

      // Obtener información adicional
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      const comments = await this.deliverableModel.getComments(deliverableId);
      
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
      const deliverable = await this.deliverableModel.findById(deliverableId);
      if (!deliverable) {
        return res.status(404).json({
          success: false,
          message: 'Entregable no encontrado'
        });
      }

      // Verificar acceso
      const userAreas = await this.userModel.getUserAreas(user.id);
      const hasAccess = userAreas.some(area => area.area_trabajo_id === deliverable.area_trabajo_id);
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para comentar este entregable'
        });
      }

      // Agregar el comentario
      const commentId = await this.deliverableModel.addComment(
        deliverableId,
        user.id,
        comentario.trim(),
        tipo || 'revision'
      );

      // Enviar notificación automática
      try {
        const deliverableDetails = await this.deliverableModel.findByIdWithDetails(deliverableId);
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
}

module.exports = DeliverableController;