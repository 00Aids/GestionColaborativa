const HistorialAreaTrabajo = require('../models/HistorialAreaTrabajo');

class AreaActivityLogger {
    constructor() {
        this.historialModel = new HistorialAreaTrabajo();
    }

    /**
     * Registrar actividad de proyecto
     */
    async logProjectActivity(areaId, userId, action, projectData, previousData = null, req = null) {
        try {
            const activityData = {
                area_trabajo_id: areaId,
                usuario_id: userId,
                accion: action,
                entidad_tipo: 'proyecto',
                entidad_id: projectData.id || null,
                descripcion: this.generateProjectDescription(action, projectData, previousData),
                datos_anteriores: previousData,
                datos_nuevos: projectData,
                ip_address: req ? this.getClientIP(req) : null,
                user_agent: req ? req.get('User-Agent') : null
            };

            return await this.historialModel.registrarActividad(activityData);
        } catch (error) {
            console.error('Error logging project activity:', error);
            // No lanzar error para no interrumpir el flujo principal
        }
    }

    /**
     * Registrar actividad de usuario
     */
    async logUserActivity(areaId, userId, action, userData, previousData = null, req = null) {
        try {
            const activityData = {
                area_trabajo_id: areaId,
                usuario_id: userId,
                accion: action,
                entidad_tipo: 'usuario',
                entidad_id: userData.id || null,
                descripcion: this.generateUserDescription(action, userData, previousData),
                datos_anteriores: previousData,
                datos_nuevos: userData,
                ip_address: req ? this.getClientIP(req) : null,
                user_agent: req ? req.get('User-Agent') : null
            };

            return await this.historialModel.registrarActividad(activityData);
        } catch (error) {
            console.error('Error logging user activity:', error);
        }
    }

    /**
     * Registrar actividad de entregable
     */
    async logDeliverableActivity(areaId, userId, action, deliverableData, previousData = null, req = null) {
        try {
            const activityData = {
                area_trabajo_id: areaId,
                usuario_id: userId,
                accion: action,
                entidad_tipo: 'entregable',
                entidad_id: deliverableData.id || null,
                descripcion: this.generateDeliverableDescription(action, deliverableData, previousData),
                datos_anteriores: previousData,
                datos_nuevos: deliverableData,
                ip_address: req ? this.getClientIP(req) : null,
                user_agent: req ? req.get('User-Agent') : null
            };

            return await this.historialModel.registrarActividad(activityData);
        } catch (error) {
            console.error('Error logging deliverable activity:', error);
        }
    }

    /**
     * Registrar actividad de evaluación
     */
    async logEvaluationActivity(areaId, userId, action, evaluationData, previousData = null, req = null) {
        try {
            const activityData = {
                area_trabajo_id: areaId,
                usuario_id: userId,
                accion: action,
                entidad_tipo: 'evaluacion',
                entidad_id: evaluationData.id || null,
                descripcion: this.generateEvaluationDescription(action, evaluationData, previousData),
                datos_anteriores: previousData,
                datos_nuevos: evaluationData,
                ip_address: req ? this.getClientIP(req) : null,
                user_agent: req ? req.get('User-Agent') : null
            };

            return await this.historialModel.registrarActividad(activityData);
        } catch (error) {
            console.error('Error logging evaluation activity:', error);
        }
    }

    /**
     * Registrar actividad de configuración
     */
    async logConfigurationActivity(areaId, userId, action, configData, previousData = null, req = null) {
        try {
            const activityData = {
                area_trabajo_id: areaId,
                usuario_id: userId,
                accion: action,
                entidad_tipo: 'configuracion',
                entidad_id: null,
                descripcion: this.generateConfigurationDescription(action, configData, previousData),
                datos_anteriores: previousData,
                datos_nuevos: configData,
                ip_address: req ? this.getClientIP(req) : null,
                user_agent: req ? req.get('User-Agent') : null
            };

            return await this.historialModel.registrarActividad(activityData);
        } catch (error) {
            console.error('Error logging configuration activity:', error);
        }
    }

    /**
     * Generar descripción para actividades de proyecto
     */
    generateProjectDescription(action, projectData, previousData) {
        const projectName = projectData.titulo || projectData.nombre || 'Proyecto';
        
        switch (action) {
            case 'crear':
                return `Creó el proyecto "${projectName}"`;
            case 'actualizar':
                return `Actualizó el proyecto "${projectName}"`;
            case 'eliminar':
                return `Eliminó el proyecto "${projectName}"`;
            case 'cambiar_estado':
                const estadoAnterior = previousData?.estado || 'desconocido';
                const estadoNuevo = projectData.estado || 'desconocido';
                return `Cambió el estado del proyecto "${projectName}" de "${estadoAnterior}" a "${estadoNuevo}"`;
            case 'asignar_estudiante':
                return `Asignó un estudiante al proyecto "${projectName}"`;
            case 'asignar_director':
                return `Asignó un director al proyecto "${projectName}"`;
            case 'asignar_evaluador':
                return `Asignó un evaluador al proyecto "${projectName}"`;
            default:
                return `Realizó la acción "${action}" en el proyecto "${projectName}"`;
        }
    }

    /**
     * Generar descripción para actividades de usuario
     */
    generateUserDescription(action, userData, previousData) {
        const userName = userData.nombres ? `${userData.nombres} ${userData.apellidos || ''}`.trim() : 'Usuario';
        
        switch (action) {
            case 'crear':
                return `Creó el usuario "${userName}"`;
            case 'actualizar':
                return `Actualizó el perfil de "${userName}"`;
            case 'activar':
                return `Activó el usuario "${userName}"`;
            case 'desactivar':
                return `Desactivó el usuario "${userName}"`;
            case 'cambiar_rol':
                const rolAnterior = previousData?.rol || 'desconocido';
                const rolNuevo = userData.rol || 'desconocido';
                return `Cambió el rol de "${userName}" de "${rolAnterior}" a "${rolNuevo}"`;
            case 'asignar_area':
                return `Asignó "${userName}" al área de trabajo`;
            default:
                return `Realizó la acción "${action}" en el usuario "${userName}"`;
        }
    }

    /**
     * Generar descripción para actividades de entregable
     */
    generateDeliverableDescription(action, deliverableData, previousData) {
        const deliverableName = deliverableData.titulo || deliverableData.nombre || 'Entregable';
        
        switch (action) {
            case 'crear':
                return `Creó el entregable "${deliverableName}"`;
            case 'actualizar':
                return `Actualizó el entregable "${deliverableName}"`;
            case 'entregar':
                return `Entregó "${deliverableName}"`;
            case 'aprobar':
                return `Aprobó el entregable "${deliverableName}"`;
            case 'rechazar':
                return `Rechazó el entregable "${deliverableName}"`;
            case 'solicitar_cambios':
                return `Solicitó cambios en el entregable "${deliverableName}"`;
            case 'comentar':
                return `Comentó en el entregable "${deliverableName}"`;
            default:
                return `Realizó la acción "${action}" en el entregable "${deliverableName}"`;
        }
    }

    /**
     * Generar descripción para actividades de evaluación
     */
    generateEvaluationDescription(action, evaluationData, previousData) {
        const evaluationName = evaluationData.titulo || 'Evaluación';
        
        switch (action) {
            case 'crear':
                return `Creó la evaluación "${evaluationName}"`;
            case 'actualizar':
                return `Actualizó la evaluación "${evaluationName}"`;
            case 'finalizar':
                return `Finalizó la evaluación "${evaluationName}"`;
            case 'calificar':
                return `Calificó la evaluación "${evaluationName}"`;
            default:
                return `Realizó la acción "${action}" en la evaluación "${evaluationName}"`;
        }
    }

    /**
     * Generar descripción para actividades de configuración
     */
    generateConfigurationDescription(action, configData, previousData) {
        switch (action) {
            case 'actualizar_configuracion':
                return 'Actualizó la configuración del área';
            case 'cambiar_permisos':
                return 'Modificó los permisos del área';
            case 'configurar_notificaciones':
                return 'Configuró las notificaciones del área';
            default:
                return `Realizó la acción "${action}" en la configuración`;
        }
    }

    /**
     * Obtener IP del cliente
     */
    getClientIP(req) {
        return req.ip || 
               req.connection.remoteAddress || 
               req.socket.remoteAddress ||
               (req.connection.socket ? req.connection.socket.remoteAddress : null);
    }

    /**
     * Obtener historial de actividades
     */
    async getActivityHistory(areaId, options = {}) {
        return await this.historialModel.obtenerHistorial(areaId, options);
    }

    /**
     * Obtener estadísticas de actividad
     */
    async getActivityStats(areaId, days = 30) {
        return await this.historialModel.obtenerEstadisticas(areaId, days);
    }

    /**
     * Obtener actividad reciente
     */
    async getRecentActivity(areaId, limit = 10) {
        return await this.historialModel.obtenerActividadReciente(areaId, limit);
    }
}

module.exports = AreaActivityLogger;