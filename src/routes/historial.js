const express = require('express');
const router = express.Router();
const ActivityLoggerMiddleware = require('../middleware/activityLogger');
const AuthMiddleware = require('../middlewares/auth');

// Instanciar el middleware de logging
const activityLogger = new ActivityLoggerMiddleware();
const historyHandlers = activityLogger.historyRoutes();

/**
 * @route GET /api/historial/:areaId
 * @desc Obtener historial de actividades del área
 * @access Private
 */
router.get('/:areaId', AuthMiddleware.requireAuth, historyHandlers.getHistory);

/**
 * @route GET /api/historial/:areaId/estadisticas
 * @desc Obtener estadísticas de actividad del área
 * @access Private
 */
router.get('/:areaId/estadisticas', AuthMiddleware.requireAuth, historyHandlers.getStats);

/**
 * @route GET /api/historial/:areaId/reciente
 * @desc Obtener actividad reciente del área
 * @access Private
 */
router.get('/:areaId/reciente', AuthMiddleware.requireAuth, historyHandlers.getRecent);

/**
 * @route GET /api/historial/mi-area
 * @desc Obtener historial de actividades del área del usuario actual
 * @access Private
 */
router.get('/mi-area', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const areaId = req.user.area_trabajo_id;
        if (!areaId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Usuario no tiene área de trabajo asignada' 
            });
        }

        // Redirigir a la ruta principal con el área del usuario
        req.params.areaId = areaId;
        return historyHandlers.getHistory(req, res);
    } catch (error) {
        console.error('Error getting user area history:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener historial del área' 
        });
    }
});

/**
 * @route GET /api/historial/mi-area/estadisticas
 * @desc Obtener estadísticas de actividad del área del usuario actual
 * @access Private
 */
router.get('/mi-area/estadisticas', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const areaId = req.user.area_trabajo_id;
        if (!areaId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Usuario no tiene área de trabajo asignada' 
            });
        }

        req.params.areaId = areaId;
        return historyHandlers.getStats(req, res);
    } catch (error) {
        console.error('Error getting user area stats:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener estadísticas del área' 
        });
    }
});

/**
 * @route GET /api/historial/mi-area/reciente
 * @desc Obtener actividad reciente del área del usuario actual
 * @access Private
 */
router.get('/mi-area/reciente', AuthMiddleware.requireAuth, async (req, res) => {
    try {
        const areaId = req.user.area_trabajo_id;
        if (!areaId) {
            return res.status(400).json({ 
                success: false, 
                message: 'Usuario no tiene área de trabajo asignada' 
            });
        }

        req.params.areaId = areaId;
        return historyHandlers.getRecent(req, res);
    } catch (error) {
        console.error('Error getting user area recent activity:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error al obtener actividad reciente del área' 
        });
    }
});

module.exports = router;