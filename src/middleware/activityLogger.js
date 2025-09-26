const AreaActivityLogger = require('../services/AreaActivityLogger');

class ActivityLoggerMiddleware {
    constructor() {
        this.logger = new AreaActivityLogger();
        this.routeActions = {
            // Rutas de proyectos
            'POST /api/proyectos': { action: 'crear', entity: 'proyecto' },
            'PUT /api/proyectos/:id': { action: 'actualizar', entity: 'proyecto' },
            'DELETE /api/proyectos/:id': { action: 'eliminar', entity: 'proyecto' },
            'PUT /api/proyectos/:id/estado': { action: 'cambiar_estado', entity: 'proyecto' },
            'POST /api/proyectos/:id/estudiantes': { action: 'asignar_estudiante', entity: 'proyecto' },
            'POST /api/proyectos/:id/director': { action: 'asignar_director', entity: 'proyecto' },
            'POST /api/proyectos/:id/evaluadores': { action: 'asignar_evaluador', entity: 'proyecto' },

            // Rutas de usuarios
            'POST /api/usuarios': { action: 'crear', entity: 'usuario' },
            'PUT /api/usuarios/:id': { action: 'actualizar', entity: 'usuario' },
            'PUT /api/usuarios/:id/activar': { action: 'activar', entity: 'usuario' },
            'PUT /api/usuarios/:id/desactivar': { action: 'desactivar', entity: 'usuario' },
            'PUT /api/usuarios/:id/rol': { action: 'cambiar_rol', entity: 'usuario' },
            'POST /api/usuarios/:id/areas': { action: 'asignar_area', entity: 'usuario' },

            // Rutas de entregables
            'POST /api/entregables': { action: 'crear', entity: 'entregable' },
            'PUT /api/entregables/:id': { action: 'actualizar', entity: 'entregable' },
            'POST /api/entregables/:id/entregar': { action: 'entregar', entity: 'entregable' },
            'PUT /api/entregables/:id/aprobar': { action: 'aprobar', entity: 'entregable' },
            'PUT /api/entregables/:id/rechazar': { action: 'rechazar', entity: 'entregable' },
            'PUT /api/entregables/:id/solicitar-cambios': { action: 'solicitar_cambios', entity: 'entregable' },
            'POST /api/entregables/:id/comentarios': { action: 'comentar', entity: 'entregable' },

            // Rutas de evaluaciones
            'POST /api/evaluaciones': { action: 'crear', entity: 'evaluacion' },
            'PUT /api/evaluaciones/:id': { action: 'actualizar', entity: 'evaluacion' },
            'PUT /api/evaluaciones/:id/finalizar': { action: 'finalizar', entity: 'evaluacion' },
            'POST /api/evaluaciones/:id/calificar': { action: 'calificar', entity: 'evaluacion' },

            // Rutas de configuración
            'PUT /api/areas/:id/configuracion': { action: 'actualizar_configuracion', entity: 'configuracion' },
            'PUT /api/areas/:id/permisos': { action: 'cambiar_permisos', entity: 'configuracion' },
            'PUT /api/areas/:id/notificaciones': { action: 'configurar_notificaciones', entity: 'configuracion' }
        };
    }

    /**
     * Middleware principal para logging de actividades
     */
    logActivity() {
        return async (req, res, next) => {
            // Continuar con la ejecución normal
            next();

            // Interceptar la respuesta para logging post-procesamiento
            const originalSend = res.send;
            res.send = function(data) {
                // Llamar al método original
                originalSend.call(this, data);

                // Solo loggear si la respuesta fue exitosa (2xx)
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    // Ejecutar logging de forma asíncrona sin bloquear
                    setImmediate(() => {
                        try {
                            const middleware = req.app.get('activityLoggerMiddleware');
                            if (middleware) {
                                middleware.processActivityLog(req, res, data);
                            }
                        } catch (error) {
                            console.error('Error in activity logging:', error);
                        }
                    });
                }
            };
        };
    }

    /**
     * Procesar el logging de actividad
     */
    async processActivityLog(req, res, responseData) {
        try {
            const routeKey = `${req.method} ${this.normalizeRoute(req.route?.path || req.path)}`;
            const routeConfig = this.routeActions[routeKey];

            if (!routeConfig) {
                return; // No hay configuración para esta ruta
            }

            const userId = req.user?.id;
            const areaId = this.extractAreaId(req);

            if (!userId || !areaId) {
                return; // No hay usuario o área identificada
            }

            // Obtener datos anteriores si es una actualización
            const previousData = req.method === 'PUT' ? req.previousData : null;
            
            // Obtener datos nuevos de la respuesta o del body
            const newData = this.extractEntityData(responseData, req.body, routeConfig.entity);

            // Registrar la actividad según el tipo de entidad
            switch (routeConfig.entity) {
                case 'proyecto':
                    await this.logger.logProjectActivity(
                        areaId, userId, routeConfig.action, newData, previousData, req
                    );
                    break;
                case 'usuario':
                    await this.logger.logUserActivity(
                        areaId, userId, routeConfig.action, newData, previousData, req
                    );
                    break;
                case 'entregable':
                    await this.logger.logDeliverableActivity(
                        areaId, userId, routeConfig.action, newData, previousData, req
                    );
                    break;
                case 'evaluacion':
                    await this.logger.logEvaluationActivity(
                        areaId, userId, routeConfig.action, newData, previousData, req
                    );
                    break;
                case 'configuracion':
                    await this.logger.logConfigurationActivity(
                        areaId, userId, routeConfig.action, newData, previousData, req
                    );
                    break;
            }
        } catch (error) {
            console.error('Error processing activity log:', error);
        }
    }

    /**
     * Normalizar ruta para matching
     */
    normalizeRoute(path) {
        return path.replace(/\/:\w+/g, '/:id');
    }

    /**
     * Extraer ID del área de trabajo
     */
    extractAreaId(req) {
        // Intentar obtener el área desde diferentes fuentes
        return req.params.areaId || 
               req.body.area_trabajo_id || 
               req.user?.area_trabajo_id ||
               req.query.area_id;
    }

    /**
     * Extraer datos de la entidad
     */
    extractEntityData(responseData, requestBody, entityType) {
        try {
            // Si responseData es string, intentar parsearlo
            let parsedResponse = responseData;
            if (typeof responseData === 'string') {
                try {
                    parsedResponse = JSON.parse(responseData);
                } catch (e) {
                    parsedResponse = {};
                }
            }

            // Obtener datos de la respuesta o del body de la request
            const data = parsedResponse.data || parsedResponse || requestBody || {};
            
            // Agregar ID si está en los parámetros
            if (requestBody && requestBody.id) {
                data.id = requestBody.id;
            }

            return data;
        } catch (error) {
            console.error('Error extracting entity data:', error);
            return requestBody || {};
        }
    }

    /**
     * Middleware para capturar datos anteriores en actualizaciones
     */
    capturePreviousData() {
        return async (req, res, next) => {
            if (req.method === 'PUT' && req.params.id) {
                try {
                    // Aquí podrías implementar lógica para obtener los datos anteriores
                    // desde la base de datos antes de la actualización
                    req.previousData = await this.getPreviousData(req);
                } catch (error) {
                    console.error('Error capturing previous data:', error);
                }
            }
            next();
        };
    }

    /**
     * Obtener datos anteriores (implementar según necesidades)
     */
    async getPreviousData(req) {
        // Esta función debería implementarse según el modelo específico
        // Por ahora retorna null
        return null;
    }

    /**
     * Middleware para rutas de historial
     */
    historyRoutes() {
        return {
            // Obtener historial de actividades
            getHistory: async (req, res) => {
                try {
                    const areaId = req.params.areaId || req.user.area_trabajo_id;
                    const options = {
                        page: parseInt(req.query.page) || 1,
                        limit: parseInt(req.query.limit) || 20,
                        usuario_id: req.query.usuario_id,
                        entidad_tipo: req.query.entidad_tipo,
                        accion: req.query.accion,
                        fecha_inicio: req.query.fecha_inicio,
                        fecha_fin: req.query.fecha_fin
                    };

                    const history = await this.logger.getActivityHistory(areaId, options);
                    res.json({ success: true, data: history });
                } catch (error) {
                    console.error('Error getting activity history:', error);
                    res.status(500).json({ success: false, message: 'Error al obtener historial' });
                }
            },

            // Obtener estadísticas de actividad
            getStats: async (req, res) => {
                try {
                    const areaId = req.params.areaId || req.user.area_trabajo_id;
                    const days = parseInt(req.query.days) || 30;

                    const stats = await this.logger.getActivityStats(areaId, days);
                    res.json({ success: true, data: stats });
                } catch (error) {
                    console.error('Error getting activity stats:', error);
                    res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
                }
            },

            // Obtener actividad reciente
            getRecent: async (req, res) => {
                try {
                    const areaId = req.params.areaId || req.user.area_trabajo_id;
                    const limit = parseInt(req.query.limit) || 10;

                    const recent = await this.logger.getRecentActivity(areaId, limit);
                    res.json({ success: true, data: recent });
                } catch (error) {
                    console.error('Error getting recent activity:', error);
                    res.status(500).json({ success: false, message: 'Error al obtener actividad reciente' });
                }
            }
        };
    }
}

module.exports = ActivityLoggerMiddleware;