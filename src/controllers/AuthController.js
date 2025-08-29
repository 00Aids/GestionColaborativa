const User = require('../models/User');
const Role = require('../models/Role');
const jwt = require('jsonwebtoken');

class AuthController {
  constructor() {
    this.userModel = new User();
    this.roleModel = new Role();
  }

  // Mostrar formulario de login
  async showLogin(req, res) {
    try {
      if (req.session.user) {
        return res.redirect('/dashboard');
      }
      res.render('auth/login', { 
        title: 'Iniciar Sesión',
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error showing login:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Procesar login
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Validar campos requeridos
      if (!email || !password) {
        req.flash('error', 'Email y contraseña son requeridos');
        return res.redirect('/auth/login');
      }

      // Autenticar usuario
      const user = await this.userModel.authenticate(email, password);
      
      if (!user) {
        req.flash('error', 'Credenciales inválidas');
        return res.redirect('/auth/login');
      }

      // Obtener información del rol
      const role = await this.roleModel.findById(user.rol_id);
      
      // Crear sesión
      req.session.user = {
        id: user.id,
        codigo_usuario: user.codigo_usuario,
        email: user.email,
        nombres: user.nombres,
        apellidos: user.apellidos,
        rol_id: user.rol_id,
        rol_nombre: role?.nombre || 'Sin rol',
        permisos: role?.permisos || []
      };

      req.flash('success', `Bienvenido, ${user.nombres}`);
      
      // Redirigir según el rol
      const redirectUrl = this.getRedirectByRole(role?.nombre);
      res.redirect(redirectUrl);
      
    } catch (error) {
      console.error('Error in login:', error);
      req.flash('error', 'Error al iniciar sesión');
      res.redirect('/auth/login');
    }
  }

  // Mostrar formulario de registro
  // Mostrar formulario de registro
  async showRegister(req, res) {
    try {
      if (req.session.user) {
        return res.redirect('/dashboard');
      }
      
      // Roles hardcodeados temporalmente para evitar error de BD
      // Línea 86 - Cambiar el rol hardcodeado
      const roles = [
        { id: 1, nombre: 'Administrador General' },
        { id: 2, nombre: 'Director de Proyecto' }, // ← CAMBIO AQUÍ
        { id: 3, nombre: 'Coordinador Académico' }, // ← CAMBIO AQUÍ
        { id: 4, nombre: 'Evaluador' },
        { id: 5, nombre: 'Estudiante' }
      ];
      
      res.render('auth/register', { 
        title: 'Registro',
        roles,
        error: req.flash('error'),
        success: req.flash('success')
      });
    } catch (error) {
      console.error('Error showing register:', error);
      res.status(500).render('errors/500', { error: 'Error interno del servidor' });
    }
  }

  // Procesar registro
  // Procesar registro
  async register(req, res) {
    try {
      const { nombre, apellido, email, password, rol_id } = req.body;
  
      // Validar campos requeridos
      if (!nombre || !apellido || !email || !password || !rol_id) {
        req.flash('error', 'Todos los campos son requeridos');
        return res.redirect('/auth/register');
      }
  
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        req.flash('error', 'El formato del email no es válido');
        return res.redirect('/auth/register');
      }
  
      // Validar longitud de contraseña
      if (password.length < 6) {
        req.flash('error', 'La contraseña debe tener al menos 6 caracteres');
        return res.redirect('/auth/register');
      }
  
      // Verificar si el usuario ya existe
      const existingUser = await this.userModel.findByEmail(email);
      if (existingUser) {
        req.flash('error', 'Ya existe un usuario registrado con este email');
        return res.redirect('/auth/register');
      }
  
      // Generar código de usuario único
      const codigoUsuario = await this.generateUserCode();
  
      // Crear el usuario en la base de datos
      const userData = {
        codigo_usuario: codigoUsuario,
        nombres: nombre,
        apellidos: apellido,
        email: email,
        password: password, // El modelo User se encarga del hash automáticamente
        rol_id: parseInt(rol_id),
        activo: true
      };
  
      await this.userModel.create(userData);
  
      req.flash('success', 'Registro exitoso. Por favor inicia sesión.');
      res.redirect('/auth/login');
      
    } catch (error) {
      console.error('Error in register:', error);
      req.flash('error', 'Error al registrar usuario. Inténtalo de nuevo.');
      res.redirect('/auth/register');
    }
  }
  
  // Método auxiliar para generar código de usuario único
  async generateUserCode() {
    try {
      const prefix = 'USR';
      let isUnique = false;
      let codigo;
      
      while (!isUnique) {
        const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        codigo = `${prefix}${randomNum}`;
        
        const existingUser = await this.userModel.findByCode(codigo);
        if (!existingUser) {
          isUnique = true;
        }
      }
      
      return codigo;
    } catch (error) {
      throw new Error(`Error generating user code: ${error.message}`);
    }
  }

  // Cerrar sesión
  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        res.redirect('/auth/login');
      });
    } catch (error) {
      console.error('Error in logout:', error);
      res.redirect('/dashboard');
    }
  }

  // Obtener URL de redirección según el rol
  // Línea 205 - Corregir redirecciones
  getRedirectByRole(roleName) {
    const roleRedirects = {
      'Administrador General': '/dashboard/admin',
      'Coordinador Académico': '/dashboard/coordinator',
      'Director de Proyecto': '/dashboard/director', // ← CAMBIO AQUÍ
      'Evaluador': '/dashboard/evaluator',
      'Estudiante': '/dashboard/student'
    };
    
    return roleRedirects[roleName] || '/dashboard';
  }
}

module.exports = AuthController;