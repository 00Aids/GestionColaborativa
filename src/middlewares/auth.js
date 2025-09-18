class AuthMiddleware {
  // Verificar si el usuario está autenticado
  static requireAuth(req, res, next) {
    if (req.session && req.session.user) {
      return next();
    }
    
    // Si es una petición AJAX, devolver JSON
    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    // Redirigir al login
    req.flash('error', 'Debes iniciar sesión para acceder a esta página');
    res.redirect('/auth/login');
  }

  // Verificar si el usuario NO está autenticado (para login/register)
  static requireGuest(req, res, next) {
    if (req.session && req.session.user) {
      return res.redirect('/dashboard');
    }
    next();
  }

  // Verificar roles específicos
  static requireRole(roles) {
    return (req, res, next) => {
      if (!req.session || !req.session.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const userRole = req.session.user.rol_nombre;
      
      // Si roles es un string, convertir a array
      const allowedRoles = Array.isArray(roles) ? roles : [roles];
      
      if (allowedRoles.includes(userRole)) {
        return next();
      }
      
      // Si es una petición AJAX, devolver JSON
      if (req.xhr || req.headers.accept.indexOf('json') > -1) {
        return res.status(403).json({ error: 'Acceso denegado' });
      }
      
      req.flash('error', 'No tienes permisos para acceder a esta página');
      res.redirect('/dashboard');
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