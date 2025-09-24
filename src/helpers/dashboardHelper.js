/**
 * Helper para generar rutas dinámicas del dashboard basadas en el rol del usuario
 */

class DashboardHelper {
  /**
   * Obtiene la ruta del dashboard según el rol del usuario
   * @param {string} roleName - Nombre del rol del usuario
   * @returns {string} - Ruta del dashboard correspondiente
   */
  static getDashboardRoute(roleName) {
    const roleRoutes = {
      'Administrador General': '/dashboard/admin',
      'Administrador': '/dashboard/admin',
      'Coordinador Académico': '/dashboard/coordinator',
      'Coordinador': '/dashboard/coordinator',
      'Director de Proyecto': '/dashboard/director',
      'Director': '/dashboard/director',
      'Evaluador': '/dashboard/evaluator',
      'Estudiante': '/dashboard/student'
    };

    return roleRoutes[roleName] || '/dashboard';
  }

  /**
   * Obtiene la ruta del dashboard desde el objeto user completo
   * @param {Object} user - Objeto usuario con rol_nombre
   * @returns {string} - Ruta del dashboard correspondiente
   */
  static getDashboardRouteFromUser(user) {
    if (!user || !user.rol_nombre) {
      return '/dashboard';
    }
    return this.getDashboardRoute(user.rol_nombre);
  }

  /**
   * Middleware para agregar la función helper a las vistas
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  static addToLocals(req, res, next) {
    // Agregar la función helper a las variables locales de las vistas
    res.locals.getDashboardRoute = DashboardHelper.getDashboardRoute;
    res.locals.getDashboardRouteFromUser = DashboardHelper.getDashboardRouteFromUser;
    
    // Si hay un usuario en sesión, agregar su ruta de dashboard
    if (req.session && req.session.user) {
      res.locals.userDashboardRoute = DashboardHelper.getDashboardRouteFromUser(req.session.user);
    } else {
      res.locals.userDashboardRoute = '/dashboard';
    }
    
    next();
  }
}

module.exports = DashboardHelper;