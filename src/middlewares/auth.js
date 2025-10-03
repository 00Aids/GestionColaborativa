const DashboardHelper = require('../helpers/dashboardHelper');

class AuthMiddleware {
  // Verificar si el usuario está autenticado
  static requireAuth(req, res, next) {
    if (req.session && req.session.user) {
      return next();
    }
    
    const accepts = req.headers.accept || '';
    const isApiRequest = req.xhr || accepts.includes('application/json') || (req.originalUrl && req.originalUrl.startsWith('/api/'));
    const isHtmlNavigation = req.method === 'GET' && !isApiRequest;

    if (!isHtmlNavigation) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    // Guardar la URL original para redirigir después del login
    req.session.redirectTo = req.originalUrl;
    
    // Redirigir al login
    req.flash('error', 'Debes iniciar sesión para acceder a esta página');
    return res.redirect('/auth/login');
  }

  // Verificar si el usuario NO está autenticado (para login/register)
  static requireGuest(req, res, next) {
    if (req.session && req.session.user) {
      return res.redirect(DashboardHelper.getDashboardRouteFromUser(req.session.user));
    }
    next();
  }

  // Verificar roles específicos
  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.session || !req.session.user) {
        const accepts = req.headers.accept || '';
        const isApiRequest = req.xhr || accepts.includes('application/json') || (req.originalUrl && req.originalUrl.startsWith('/api/'));
        const isHtmlNavigation = req.method === 'GET' && !isApiRequest;

        if (!isHtmlNavigation) {
          return res.status(401).json({ error: 'No autorizado' });
        }

        // Guardar la URL original para redirigir después del login
        req.session.redirectTo = req.originalUrl;
        req.flash('error', 'Debes iniciar sesión para acceder a esta página');
        return res.redirect('/auth/login');
      }

      const userRole = req.session.user.rol_nombre;
      
      // Si roles es un string, convertir a array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      
      // Si es una petición API/AJAX, devolver JSON, de lo contrario redirigir
      const accepts = req.headers.accept || '';
      const isApiRequest = req.xhr || accepts.includes('application/json') || (req.originalUrl && req.originalUrl.startsWith('/api/'));
      if (isApiRequest) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      
      req.flash('error', 'No tienes permisos para acceder a esta página');
      res.redirect(DashboardHelper.getDashboardRouteFromUser(req.session.user));
    };
  }

  // Middleware para agregar usuario a las vistas
  static addUserToViews(req, res, next) {
    res.locals.user = req.session ? req.session.user : null;
    res.locals.isAuthenticated = !!(req.session && req.session.user);
    // Asignar req.user para compatibilidad con otros middlewares
    req.user = req.session ? req.session.user : null;
    next();
  }
}

module.exports = AuthMiddleware;