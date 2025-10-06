const Notification = require('../models/Notification');
const User = require('../models/User');
const Project = require('../models/Project');

class DeliverableNotificationService {
    constructor() {
        this.notificationModel = new Notification();
        this.userModel = new User();
        this.projectModel = new Project();
    }

    // Notificar cuando un estudiante entrega un trabajo
    async notifyDeliverableSubmitted(projectId, deliverableId, studentName, titulo) {
        try {
            const projectInfo = await this.projectModel.findByIdWithDetails(projectId);

            // Notificar al coordinador si existe (no bloquear si no existe)
            if (projectInfo && projectInfo.coordinador_id) {
                const notificationData = {
                    titulo: '📋 Nuevo Entregable Recibido',
                    mensaje: `El estudiante ha entregado: "${titulo}" en el proyecto "${projectInfo.titulo}"`,
                    tipo: 'info',
                    url_accion: `/coordinator/deliverables?deliverable=${deliverableId}`
                };

                await this.notificationModel.createForUser(projectInfo.coordinador_id, notificationData);
                console.log(`✅ Notificación enviada al coordinador ${projectInfo.coordinador_id} por entregable ${deliverableId}`);
            }

            // Crear notificación para el director si existe
            if (projectInfo && projectInfo.director_id) {
                const directorNotification = {
                    titulo: '📋 Nuevo Entregable para Evaluar',
                    mensaje: `El estudiante ha enviado el entregable "${titulo}" para su evaluación en el proyecto "${projectInfo.titulo}"`,
                    tipo: 'info',
                    url_accion: `/director/deliverables?deliverable=${deliverableId}`
                };
                await this.notificationModel.createForUser(projectInfo.director_id, directorNotification);
                console.log(`✅ Notificación enviada al director ${projectInfo.director_id} por entregable ${deliverableId}`);
            }

            // Crear notificación para el evaluador si existe
            if (projectInfo && projectInfo.evaluador_id) {
                const evaluadorNotification = {
                    titulo: '📋 Nuevo Entregable para Evaluar',
                    mensaje: `El estudiante ha enviado el entregable "${titulo}" para su evaluación en el proyecto "${projectInfo.titulo}"`,
                    tipo: 'info',
                    url_accion: `/evaluator/evaluations?deliverable=${deliverableId}`
                };
                await this.notificationModel.createForUser(projectInfo.evaluador_id, evaluadorNotification);
                console.log(`✅ Notificación enviada al evaluador ${projectInfo.evaluador_id} por entregable ${deliverableId}`);
            }
        } catch (error) {
            console.error('Error notifying deliverable submission:', error);
        }
    }

    // Notificar cuando el coordinador aprueba un entregable
    async notifyDeliverableApproved(deliverableId, deliverableData, coordinatorId) {
        try {
            const { estudiante_id, titulo, proyecto_titulo } = deliverableData;

            const notificationData = {
                titulo: '✅ Entregable Aprobado',
                mensaje: `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" ha sido aprobado`,
                tipo: 'success',
                url_accion: `/student/deliverables?deliverable=${deliverableId}`
            };

            await this.notificationModel.createForUser(estudiante_id, notificationData);
            console.log(`✅ Notificación de aprobación enviada al estudiante ${estudiante_id}`);
        } catch (error) {
            console.error('Error notifying deliverable approval:', error);
        }
    }

    // Notificar cuando el coordinador rechaza un entregable
    async notifyDeliverableRejected(deliverableId, deliverableData, coordinatorId, comentario = '') {
        try {
            const { estudiante_id, titulo, proyecto_titulo } = deliverableData;

            const mensaje = comentario 
                ? `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" ha sido rechazado. Comentario: ${comentario}`
                : `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" ha sido rechazado`;

            const notificationData = {
                titulo: '❌ Entregable Rechazado',
                mensaje,
                tipo: 'error',
                url_accion: `/student/deliverables?deliverable=${deliverableId}`
            };

            await this.notificationModel.createForUser(estudiante_id, notificationData);
            console.log(`✅ Notificación de rechazo enviada al estudiante ${estudiante_id}`);
        } catch (error) {
            console.error('Error notifying deliverable rejection:', error);
        }
    }

    // Notificar cuando se requieren cambios en un entregable
    async notifyDeliverableNeedsChanges(deliverableId, deliverableData, coordinatorId, comentario = '') {
        try {
            const { estudiante_id, titulo, proyecto_titulo } = deliverableData;

            const mensaje = comentario 
                ? `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" requiere cambios. Comentario: ${comentario}`
                : `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" requiere cambios`;

            const notificationData = {
                titulo: '🔄 Entregable Requiere Cambios',
                mensaje,
                tipo: 'warning',
                url_accion: `/student/deliverables?deliverable=${deliverableId}`
            };

            await this.notificationModel.createForUser(estudiante_id, notificationData);
            console.log(`✅ Notificación de cambios requeridos enviada al estudiante ${estudiante_id}`);
        } catch (error) {
            console.error('Error notifying deliverable changes needed:', error);
        }
    }

    // Notificar cuando un entregable está próximo a vencer
    async notifyDeliverableDueSoon(deliverableId, deliverableData, daysUntilDue) {
        try {
            const { estudiante_id, titulo, proyecto_titulo, fecha_limite } = deliverableData;

            const notificationData = {
                titulo: '⏰ Entregable Próximo a Vencer',
                mensaje: `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" vence en ${daysUntilDue} días (${fecha_limite})`,
                tipo: 'warning',
                url_accion: `/student/deliverables?deliverable=${deliverableId}`
            };

            await this.notificationModel.createForUser(estudiante_id, notificationData);
            console.log(`✅ Notificación de vencimiento enviada al estudiante ${estudiante_id}`);
        } catch (error) {
            console.error('Error notifying deliverable due soon:', error);
        }
    }

    // Notificar cuando un entregable ha vencido
    async notifyDeliverableOverdue(deliverableId, deliverableData) {
        try {
            const { estudiante_id, titulo, proyecto_titulo, coordinador_id } = deliverableData;

            // Notificar al estudiante
            const studentNotification = {
                titulo: '🚨 Entregable Vencido',
                mensaje: `Tu entregable "${titulo}" del proyecto "${proyecto_titulo}" ha vencido`,
                tipo: 'error',
                url_accion: `/student/deliverables?deliverable=${deliverableId}`
            };

            await this.notificationModel.createForUser(estudiante_id, studentNotification);

            // Notificar al coordinador
            if (coordinador_id) {
                const coordinatorNotification = {
                    titulo: '🚨 Entregable Vencido',
                    mensaje: `El entregable "${titulo}" del proyecto "${proyecto_titulo}" ha vencido sin ser entregado`,
                    tipo: 'error',
                    url_accion: `/coordinator/deliverables?deliverable=${deliverableId}`
                };

                await this.notificationModel.createForUser(coordinador_id, coordinatorNotification);
            }

            console.log(`✅ Notificaciones de vencimiento enviadas para entregable ${deliverableId}`);
        } catch (error) {
            console.error('Error notifying deliverable overdue:', error);
        }
    }

    // Notificar cuando se agrega un comentario a un entregable
    async notifyDeliverableComment(deliverableId, deliverableData, commentData) {
        try {
            const { estudiante_id, titulo, proyecto_titulo } = deliverableData;
            const { autor_nombre, comentario } = commentData;

            const notificationData = {
                titulo: '💬 Nuevo Comentario en Entregable',
                mensaje: `${autor_nombre} ha comentado en tu entregable "${titulo}": ${comentario.substring(0, 100)}${comentario.length > 100 ? '...' : ''}`,
                tipo: 'info',
                url_accion: `/student/deliverables?deliverable=${deliverableId}`
            };

            await this.notificationModel.createForUser(estudiante_id, notificationData);
            console.log(`✅ Notificación de comentario enviada al estudiante ${estudiante_id}`);
        } catch (error) {
            console.error('Error notifying deliverable comment:', error);
        }
    }
}

module.exports = DeliverableNotificationService;