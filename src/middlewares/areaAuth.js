const User = require('../models/User');
const AreaTrabajo = require('../models/AreaTrabajo');

/**
 * Middleware para verificar que el usuario tenga acceso al área de trabajo
 * @param {Object} req - Request object
 * @param {Object} res - Response object  
 * @param {Function} next - Next middleware function
 */
const verifyAreaAccess = async (req, res, next) => {
  try {
    // Si no hay usuario autenticado, pasar al siguiente middleware
    if (!req.user) {
      return next();
    }

    // Obtener el área de trabajo del parámetro, query o body
    const areaTrabajoId = req.params.areaId || req.query.areaId || req.body.area_trabajo_id;
    
    // Si no se especifica área de trabajo, usar el área por defecto del usuario
    if (!areaTrabajoId) {
      // Obtener el área por defecto del usuario
      const userAreas = await User.getUserAreas(req.user.id);
      if (userAreas.length > 0) {
        req.areaTrabajoId = userAreas[0].area_trabajo_id;
        req.userAreas = userAreas;
        return next();
      } else {
        return res.status(403).json({
          error: 'Usuario no tiene acceso a ningún área de trabajo'
        });
      }
    }

    // Verificar que el usuario tenga acceso al área especificada
    const hasAccess = await User.hasAreaAccess(req.user.id, areaTrabajoId);
    
    if (!hasAccess) {
      return res.status(403).json({
        error: 'No tienes acceso a esta área de trabajo'
      });
    }

    // Agregar información del área al request
    req.areaTrabajoId = areaTrabajoId;
    req.userAreas = await User.getUserAreas(req.user.id);
    
    next();
  } catch (error) {
    console.error('Error en middleware de área de trabajo:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

/**
 * Middleware para cargar las áreas de trabajo del usuario
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const loadUserAreas = async (req, res, next) => {
  try {
    if (req.user) {
      // Crear instancia del modelo User
      const userModel = new User();
      
      req.userAreas = await userModel.getUserAreas(req.user.id);
      
      // Si el usuario no tiene áreas asignadas, asignar área por defecto
      if (req.userAreas.length === 0) {
        const defaultArea = await AreaTrabajo.getDefaultArea();
        if (defaultArea) {
          await userModel.assignToArea(req.user.id, defaultArea.id);
          req.userAreas = await userModel.getUserAreas(req.user.id);
        }
      }
      
      // Establecer el área de trabajo principal del usuario para filtrado
      if (req.userAreas.length > 0) {
        req.areaTrabajoId = req.userAreas[0].area_trabajo_id;
      }
    }
    next();
  } catch (error) {
    console.error('Error cargando áreas del usuario:', error);
    next();
  }
};

/**
 * Middleware para verificar permisos de administrador en el área
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware function
 */
const requireAreaAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Usuario no autenticado'
      });
    }

    // Los administradores ahora están restringidos a su área específica
    // No hay acceso global, todos deben tener un área asignada
    const areaTrabajoId = req.areaTrabajoId || req.params.areaId || req.query.areaId;
    
    if (!areaTrabajoId) {
      return res.status(400).json({
        error: 'Área de trabajo no especificada'
      });
    }

    // Verificar si es administrador del área específica
    const isAreaAdmin = await User.isAreaAdmin(req.user.id, areaTrabajoId);
    
    if (!isAreaAdmin) {
      return res.status(403).json({
        error: 'Requiere permisos de administrador en esta área de trabajo'
      });
    }

    next();
  } catch (error) {
    console.error('Error verificando permisos de administrador:', error);
    res.status(500).json({
      error: 'Error interno del servidor'
    });
  }
};

module.exports = {
  verifyAreaAccess,
  loadUserAreas,
  requireAreaAdmin
};