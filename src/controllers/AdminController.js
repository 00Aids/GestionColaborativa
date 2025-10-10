const User = require('../models/User');
const Role = require('../models/Role');
const Project = require('../models/Project');
const Entregable = require('../models/Entregable');
const BaseModel = require('../models/BaseModel');
const Task = require('../models/Task');
const DashboardHelper = require('../helpers/dashboardHelper');
const FileHelper = require('../helpers/fileHelper');
const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

class AdminController {
  constructor() {
    this.userModel = new User();
    this.roleModel = new Role();
    this.projectModel = new Project();
    this.entregableModel = new Entregable();
    this.lineasInvestigacionModel = new BaseModel('lineas_investigacion');
    this.ciclosAcademicosModel = new BaseModel('ciclos_academicos');
    this.taskModel = new Task();
  }

  // Mostrar página de gestión de usuarios
  async users(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Obtener todos los usuarios con información de rol
      const allUsers = await this.userModel.findWithRole();
      
      // Obtener usuarios recientes (últimos 10)
      const recentUsers = allUsers.slice(0, 10);
      
      // Obtener estadísticas de usuarios
      const userStats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.activo).length,
        inactive: allUsers.filter(u => !u.activo).length,
        byRole: {}
      };
      
      // Agrupar por roles
      allUsers.forEach(user => {
        const roleName = user.rol_nombre || 'Sin rol';
        userStats.byRole[roleName] = (userStats.byRole[roleName] || 0) + 1;
      });
      
      // Obtener todos los roles disponibles
      const roles = await this.roleModel.findAll();

      res.render('admin/users', {
        title: 'Gestión de Usuarios',
        user,
        allUsers,
        recentUsers,
        userStats,
        roles: roles || [],
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin users:', error);
      req.flash('error', 'Error al cargar la gestión de usuarios');
      res.redirect('/dashboard/admin');
    }
  }

  // API para obtener usuarios por rol (devuelve JSON)
  async getUsersByRole(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No tienes permisos para acceder a esta información.' });
      }

      const { role } = req.query;
      
      if (!role) {
        return res.status(400).json({ error: 'El parámetro role es requerido.' });
      }

      // Obtener usuarios con información de rol
      const allUsers = await this.userModel.findWithRole();
      
      // Filtrar usuarios por rol
      let filteredUsers = [];
      
      if (role === 'director') {
        filteredUsers = allUsers.filter(u => u.rol_nombre === 'Director de Proyecto' && u.activo);
      } else if (role === 'student') {
        filteredUsers = allUsers.filter(u => u.rol_nombre === 'Estudiante' && u.activo);
      } else if (role === 'coordinator') {
        filteredUsers = allUsers.filter(u => u.rol_nombre === 'Coordinador Académico' && u.activo);
      } else if (role === 'evaluator') {
        filteredUsers = allUsers.filter(u => u.rol_nombre === 'Evaluador' && u.activo);
      } else {
        // Si se especifica un rol específico, buscar por ese nombre
        filteredUsers = allUsers.filter(u => u.rol_nombre === role && u.activo);
      }

      // Formatear la respuesta para incluir solo los campos necesarios
      const formattedUsers = filteredUsers.map(u => ({
        id: u.id,
        nombre: u.nombre,
        apellido: u.apellido,
        email: u.email,
        rol_nombre: u.rol_nombre,
        area_trabajo_id: u.area_trabajo_id,
        area_trabajo_nombre: u.area_trabajo_nombre,
        area_trabajo_codigo: u.area_trabajo_codigo
      }));

      res.json(formattedUsers);
    } catch (error) {
      console.error('Error in getUsersByRole:', error);
      res.status(500).json({ error: 'Error al obtener usuarios por rol' });
    }
  }

  // Mostrar página de gestión de roles
  async roles(req, res) {
    try {
      console.log('=== DEBUG: Iniciando método roles ===');
      const user = req.session.user;
      console.log('Usuario:', user ? user.rol_nombre : 'No user');
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        console.log('ERROR: Usuario no autorizado');
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }
  
      console.log('=== Obteniendo todos los roles ===');
      // Obtener todos los roles
      const allRoles = await this.roleModel.findAll();
      console.log('Roles encontrados:', allRoles.length);
      
      console.log('=== Obteniendo roles activos ===');
      // Obtener roles activos
      const activeRoles = await this.roleModel.findActive();
      console.log('Roles activos:', activeRoles.length);
      
      console.log('=== Obteniendo usuarios con rol ===');
      // Contar usuarios por rol
      const usersWithRole = await this.userModel.findWithRole();
      console.log('Usuarios con rol:', usersWithRole.length);
      
      const usersByRole = {};
      const userCounts = {}; // Nuevo objeto para contar por ID
      
      usersWithRole.forEach(user => {
        const roleName = user.rol_nombre || 'Sin rol';
        const roleId = user.rol_id;
        
        // Mantener el conteo por nombre para estadísticas
        usersByRole[roleName] = (usersByRole[roleName] || 0) + 1;
        
        // Agregar conteo por ID para la vista
        if (roleId) {
          userCounts[roleId] = (userCounts[roleId] || 0) + 1;
        }
      });
      console.log('Usuarios por rol:', usersByRole);
      console.log('Usuarios por ID de rol:', userCounts);
      
      // Calcular cuántos roles tienen usuarios asignados
      const rolesWithUsers = Object.keys(usersByRole).filter(roleName => roleName !== 'Sin rol').length;
      console.log('Roles con usuarios:', rolesWithUsers);
      
      // Definir permisos disponibles en el sistema
      const availablePermissions = [
        'ADMIN_USERS',
        'ADMIN_ROLES', 
        'ADMIN_PROJECTS',
        'ADMIN_REPORTS',
        'ADMIN_SETTINGS',
        'ADMIN_CALENDAR',
        'ADMIN_INVITATIONS',
        'ADMIN_BACKUP',
        'ADMIN_LOGS',
        'VIEW_DASHBOARD',
        'MANAGE_PROJECTS',
        'MANAGE_TASKS',
        'MANAGE_DELIVERABLES',
        'MANAGE_EVALUATIONS',
        'VIEW_REPORTS',
        'MANAGE_NOTIFICATIONS'
      ];
      
      // Obtener estadísticas de roles
      const roleStats = {
        total: allRoles.length,
        active: activeRoles.length,
        inactive: allRoles.filter(r => !r.activo).length,
        withUsers: rolesWithUsers
      };

      res.render('admin/roles', {
        title: 'Gestión de Roles',
        user,
        roles: allRoles,
        activeRoles,
        roleStats,
        userCounts, // Ahora pasamos userCounts que tiene los IDs como clave
        availablePermissions,
        success: req.flash('success'),
        error: req.flash('error')
      });
      console.log('=== Vista renderizada exitosamente ===');
    } catch (error) {
      console.error('Error in admin roles:', error);
      req.flash('error', 'Error al cargar la gestión de roles');
      res.redirect('/dashboard/admin');
    }
  }

  // API para obtener roles disponibles (JSON)
  async getRolesAPI(req, res) {
    try {
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Obtener roles activos
      const roles = await this.roleModel.findActive();
      
      res.json({ 
        success: true, 
        roles: roles 
      });
    } catch (error) {
      console.error('Error getting roles API:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Error al obtener roles' 
      });
    }
  }

  // Crear nuevo rol
  async createRole(req, res) {
    try {
      const { nombre, descripcion, permisos } = req.body;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      // Validar datos requeridos
      if (!nombre || !descripcion) {
        return res.status(400).json({ error: 'Nombre y descripción son requeridos' });
      }

      // Verificar que el nombre no exista
      const existingRole = await this.roleModel.findByName(nombre);
      if (existingRole) {
        return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
      }

      // Preparar datos del rol
      const roleData = {
        nombre,
        descripcion,
        permisos: permisos || {},
        activo: true
      };

      // Crear rol
      const newRole = await this.roleModel.create(roleData);

      res.json({ 
        success: true, 
        message: 'Rol creado exitosamente',
        role: newRole
      });
    } catch (error) {
      console.error('Error creating role:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar rol
  async updateRole(req, res) {
    try {
      const { roleId } = req.params;
      const { nombre, descripcion, permisos } = req.body;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const role = await this.roleModel.findById(roleId);
      if (!role) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      // No permitir editar el rol de Administrador General
      if (role.nombre === 'Administrador General') {
        return res.status(400).json({ error: 'No se puede modificar el rol de Administrador General' });
      }

      // Verificar nombre único (si se está cambiando)
      if (nombre && nombre !== role.nombre) {
        const existingRole = await this.roleModel.findByName(nombre);
        if (existingRole) {
          return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
        }
      }

      // Preparar datos de actualización
      const updateData = {};
      if (nombre) updateData.nombre = nombre;
      if (descripcion) updateData.descripcion = descripcion;
      if (permisos) updateData.permisos = permisos;

      // Actualizar rol
      await this.roleModel.update(roleId, updateData);

      res.json({ 
        success: true, 
        message: 'Rol actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error updating role:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Cambiar estado de rol (activar/desactivar)
  async toggleRoleStatus(req, res) {
    try {
      const { roleId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const role = await this.roleModel.findById(roleId);
      if (!role) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      // No permitir desactivar el rol de Administrador General
      if (role.nombre === 'Administrador General') {
        return res.status(400).json({ error: 'No se puede desactivar el rol de Administrador General' });
      }

      // Cambiar estado
      const newStatus = !role.activo;
      await this.roleModel.update(roleId, { activo: newStatus });

      res.json({ 
        success: true, 
        message: `Rol ${newStatus ? 'activado' : 'desactivado'} exitosamente`,
        newStatus
      });
    } catch (error) {
      console.error('Error toggling role status:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar rol
  async deleteRole(req, res) {
    try {
      const { roleId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const role = await this.roleModel.findById(roleId);
      if (!role) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      // No permitir eliminar el rol de Administrador General
      if (role.nombre === 'Administrador General') {
        return res.status(400).json({ error: 'No se puede eliminar el rol de Administrador General' });
      }

      // Verificar si hay usuarios con este rol
      const usersWithRole = await this.userModel.findAll({ rol_id: roleId });
      if (usersWithRole.length > 0) {
        return res.status(400).json({ 
          error: `No se puede eliminar el rol porque ${usersWithRole.length} usuario(s) lo tienen asignado` 
        });
      }

      // Eliminar rol
      await this.roleModel.delete(roleId);

      res.json({ 
        success: true, 
        message: 'Rol eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error deleting role:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener detalles de un rol
  async getRoleDetails(req, res) {
    try {
      const { roleId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const role = await this.roleModel.findById(roleId);
      if (!role) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      // Obtener usuarios con este rol
      const usersWithRole = await this.userModel.findAll({ rol_id: roleId });

      res.json({ 
        success: true, 
        role,
        usersCount: usersWithRole.length,
        users: usersWithRole
      });
    } catch (error) {
      console.error('Error getting role details:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Activar/desactivar usuario
  async toggleUserStatus(req, res) {
    try {
      const { userId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const targetUser = await this.userModel.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No permitir desactivar al propio administrador
      if (targetUser.id === user.id) {
        return res.status(400).json({ error: 'No puedes desactivar tu propia cuenta' });
      }

      // Cambiar estado
      const newStatus = !targetUser.activo;
      await this.userModel.update(userId, { activo: newStatus });

      res.json({ 
        success: true, 
        message: `Usuario ${newStatus ? 'activado' : 'desactivado'} correctamente`,
        newStatus 
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Cambiar rol de usuario
  async changeUserRole(req, res) {
    try {
      const { userId } = req.params;
      const { roleId } = req.body;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const targetUser = await this.userModel.findById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      // No permitir cambiar el rol del propio administrador
      if (targetUser.id === user.id) {
        return res.status(400).json({ error: 'No puedes cambiar tu propio rol' });
      }

      // Verificar que el rol existe
      const role = await this.roleModel.findById(roleId);
      if (!role) {
        return res.status(404).json({ error: 'Rol no encontrado' });
      }

      // Actualizar rol
      await this.userModel.update(userId, { rol_id: roleId });

      res.json({ 
        success: true, 
        message: `Rol cambiado a ${role.nombre} correctamente`,
        newRole: role.nombre
      });
    } catch (error) {
      console.error('Error changing user role:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Mostrar página de gestión de proyectos
  async projects(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Obtener parámetros de filtros de la URL
      const {
        search = '',
        status = '',
        linea = '',
        sort = '',
        dateFilter = '',
        dateFrom = '',
        dateTo = '',
        director = '',
        estudiante = '',
        progreso = ''
      } = req.query;

      // Obtener todos los proyectos con detalles filtrados por área de trabajo
      const areaFilter = req.areaTrabajoId ? { area_trabajo_id: req.areaTrabajoId } : {};
      let allProjects = await this.projectModel.findWithDetails(areaFilter);
      
      // Aplicar filtro de búsqueda por título
      if (search) {
        allProjects = allProjects.filter(project => 
          project.titulo.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      // Aplicar filtro por estado
      if (status) {
        allProjects = allProjects.filter(project => project.estado === status);
      }
      
      // Aplicar filtro por línea de investigación
      if (linea) {
        allProjects = allProjects.filter(project => project.linea_investigacion_id == linea);
      }
      
      // Obtener proyectos recientes (últimos 10)
      const recentProjects = allProjects.slice(0, 10);
      
      // Obtener estadísticas de proyectos
      const projectStats = {
        total: allProjects.length,
        active: allProjects.filter(p => ['en_desarrollo', 'en_revision', 'enviado'].includes(p.estado)).length,
        completed: allProjects.filter(p => p.estado === 'finalizado').length,
        pending: allProjects.filter(p => p.estado === 'borrador').length,
        borrador: allProjects.filter(p => p.estado === 'borrador').length,
        enviado: allProjects.filter(p => p.estado === 'enviado').length,
        en_revision: allProjects.filter(p => p.estado === 'en_revision').length,
        aprobado: allProjects.filter(p => p.estado === 'aprobado').length,
        rechazado: allProjects.filter(p => p.estado === 'rechazado').length,
        en_desarrollo: allProjects.filter(p => p.estado === 'en_desarrollo').length,
        finalizado: allProjects.filter(p => p.estado === 'finalizado').length
      };
      
      // Obtener líneas de investigación y ciclos académicos para formularios
      const lineasInvestigacion = await this.lineasInvestigacionModel.findAll();
      const ciclosAcademicos = await this.ciclosAcademicosModel.findAll();
      
      // Obtener usuarios para asignar como directores/estudiantes
      const allUsers = await this.userModel.findWithRole();
      const directores = allUsers.filter(user => 
          user.rol_nombre === 'Director de Proyecto' || 
          user.rol_nombre === 'Administrador General'
      );
      const estudiantes = allUsers.filter(u => u.rol_nombre === 'Estudiante');

      res.render('admin/projects', {
        title: 'Gestión de Proyectos',
        user,
        projects: allProjects,
        recentProjects,
        stats: projectStats,
        lineasInvestigacion,
        ciclosAcademicos,
        directores,
        estudiantes,
        pagination: {
          currentPage: 1,
          totalPages: 1,
          totalItems: allProjects.length
        },
        search,
        statusFilter: status,
        lineaFilter: linea,
        sortFilter: sort,
        dateFilter,
        dateFrom,
        dateTo,
        director,
        estudiante,
        progreso,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin projects:', error);
      req.flash('error', 'Error al cargar la gestión de proyectos');
      res.redirect('/dashboard/admin');
    }
  }

  // Mostrar formulario para crear nuevo proyecto
  async newProject(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y tiene permisos para crear proyectos
      if (!user || !['Administrador General', 'Director de Proyecto', 'Director', 'Coordinador Académico'].includes(user.rol_nombre)) {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Debug: verificar el contenido del usuario y área de trabajo
      console.log('🔍 Usuario en newProject:', JSON.stringify(user, null, 2));
      console.log('🏢 req.areaTrabajoId:', req.areaTrabajoId);
      console.log('🏢 req.userAreas:', req.userAreas);
      
      // Determinar el área de trabajo a usar (middleware, único área del usuario, o fallback 1)
      const areaTrabajoId = (req.areaTrabajoId !== undefined && req.areaTrabajoId !== null)
        ? req.areaTrabajoId
        : (Array.isArray(req.userAreas) && req.userAreas.length === 1
            ? (req.userAreas[0].area_trabajo_id || req.userAreas[0].id)
            : 1);
      console.log('🏢 Usando area_trabajo_id:', areaTrabajoId);

      // Obtener líneas de investigación del área del usuario
      const lineasInvestigacion = await this.lineasInvestigacionModel.query(`
        SELECT * FROM lineas_investigacion 
        WHERE area_trabajo_id = ? AND activo = 1
        ORDER BY nombre
      `, [areaTrabajoId]);

      // Obtener ciclos académicos del área del usuario
      const ciclosAcademicos = await this.ciclosAcademicosModel.query(`
        SELECT * FROM ciclos_academicos 
        WHERE area_trabajo_id = ? AND activo = 1
        ORDER BY fecha_inicio DESC
      `, [areaTrabajoId]);

      // Obtener usuarios para asignar como directores/estudiantes
      const allUsers = await this.userModel.findWithRole();
      const directores = allUsers.filter(user => 
          user.rol_nombre === 'Director de Proyecto' || 
          user.rol_nombre === 'Administrador General'
      );
      const estudiantes = allUsers.filter(u => u.rol_nombre === 'Estudiante');

      res.render('admin/project-new', {
        title: 'Crear Nuevo Proyecto',
        user,
        lineasInvestigacion: lineasInvestigacion || [],
        ciclosAcademicos: ciclosAcademicos || [],
        directores: directores || [],
        estudiantes: estudiantes || [],
        userAreas: req.userAreas || [],
        areaTrabajoId,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in newProject:', error);
      req.flash('error', 'Error al cargar el formulario de nuevo proyecto');
      res.redirect('/admin/projects');
    }
  }

  // Mostrar formulario para agregar nuevo usuario
  async newUser(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Obtener todos los roles disponibles
      const roles = await this.roleModel.findAll();

      res.render('admin/user-new', {
        title: 'Agregar Nuevo Usuario',
        user,
        roles,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in newUser:', error);
      req.flash('error', 'Error al cargar el formulario de nuevo usuario');
      res.redirect('/admin/users');
    }
  }

  // Crear nuevo proyecto
  async createProject(req, res) {
    try {
      // Verificar permisos de administrador
      const user = req.session.user;
      if (!user || !['Administrador General', 'Coordinador Académico', 'Director de Proyecto', 'Director'].includes(user.rol_nombre)) {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para crear proyectos' 
        });
      }

      const { titulo, descripcion, estudiante_id, director_id, linea_investigacion_id, ciclo_academico_id, estado, fecha_inicio, fecha_fin, area_trabajo_id } = req.body;

      // Validaciones - solo campos realmente obligatorios
      if (!titulo || !descripcion || !ciclo_academico_id || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ 
          success: false, 
          message: 'Todos los campos obligatorios deben ser completados (título, descripción, ciclo académico, fecha de inicio y fecha de fin)' 
        });
      }

      // Validar que la fecha de fin sea posterior a la fecha de inicio
      if (new Date(fecha_fin) <= new Date(fecha_inicio)) {
        return res.status(400).json({ 
          success: false, 
          message: 'La fecha de fin debe ser posterior a la fecha de inicio' 
        });
      }

      // Determinar área de trabajo seleccionada con verificación de acceso
      let selectedAreaId = req.areaTrabajoId;
      if (area_trabajo_id) {
        const requestedAreaId = parseInt(area_trabajo_id);
        if (Array.isArray(req.userAreas) && req.userAreas.some(a => (a.area_trabajo_id || a.id) === requestedAreaId)) {
          selectedAreaId = requestedAreaId;
        }
      }
      // Fallback: si no está definido, usar el único área del usuario si existe
      if (!selectedAreaId && Array.isArray(req.userAreas) && req.userAreas.length === 1) {
        selectedAreaId = req.userAreas[0].area_trabajo_id || req.userAreas[0].id;
      }
      // Si aún no se puede determinar, devolver error claro
      if (!selectedAreaId) {
        return res.status(400).json({
          success: false,
          message: 'No se pudo determinar el área de trabajo para el proyecto. Verifica tu área asignada o selecciona una.'
        });
      }

      // Determinar director final: si no se envía y el creador es Director/Director de Proyecto, asignarlo automáticamente
      let directorIdFinal = director_id ? parseInt(director_id) : null;
      if (!directorIdFinal && (user.rol_nombre === 'Director' || user.rol_nombre === 'Director de Proyecto')) {
        directorIdFinal = user.id;
      }

      // Crear el proyecto usando los campos existentes de la base de datos
      const projectData = {
        titulo,
        descripcion,
        estudiante_id: estudiante_id ? parseInt(estudiante_id) : null,
        director_id: directorIdFinal,
        linea_investigacion_id: linea_investigacion_id ? parseInt(linea_investigacion_id) : null,
        ciclo_academico_id: parseInt(ciclo_academico_id),
        area_trabajo_id: selectedAreaId, // Asignar área de trabajo seleccionada o la del middleware
        estado: estado || 'borrador',
        fecha_inicio,
        fecha_fin
        // fecha_propuesta se establece automáticamente con CURRENT_TIMESTAMP
        // fecha_aprobacion y fecha_finalizacion se establecerán cuando corresponda
      };

      const createdProject = await this.projectModel.create(projectData);

      res.json({ 
        success: true, 
        message: 'Proyecto creado exitosamente',
        projectId: createdProject.id 
      });

    } catch (error) {
      console.error('Error al crear proyecto:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor' 
      });
    }
  }

  // Actualizar proyecto
  async updateProject(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { projectId } = req.params;
      const { titulo, descripcion, linea_investigacion_id, ciclo_academico_id, director_id, estudiante_id, estado, fecha_inicio, fecha_fin } = req.body;

      // Validar que el proyecto existe
      const existingProject = await this.projectModel.findById(projectId);
      if (!existingProject) {
        return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' });
      }

      // Validar fechas si se proporcionan
      if (fecha_inicio && fecha_fin && new Date(fecha_fin) <= new Date(fecha_inicio)) {
        return res.status(400).json({ 
          success: false, 
          message: 'La fecha de fin debe ser posterior a la fecha de inicio' 
        });
      }

      // Preparar datos para actualizar (filtrar campos undefined)
      const updateData = {};
      
      if (titulo !== undefined) updateData.titulo = titulo;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (linea_investigacion_id !== undefined) updateData.linea_investigacion_id = linea_investigacion_id;
      if (ciclo_academico_id !== undefined) updateData.ciclo_academico_id = ciclo_academico_id;
      if (director_id !== undefined) updateData.director_id = director_id;
      if (estudiante_id !== undefined) updateData.estudiante_id = estudiante_id;
      if (estado !== undefined) updateData.estado = estado;
      if (fecha_inicio !== undefined) updateData.fecha_inicio = fecha_inicio;
      if (fecha_fin !== undefined) updateData.fecha_fin = fecha_fin;

      await this.projectModel.update(projectId, updateData);
      
      res.json({ success: true, message: 'Proyecto actualizado exitosamente.' });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar el proyecto.' });
    }
  }

  // Cambiar estado del proyecto
  async changeProjectStatus(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { projectId } = req.params; // Cambiar de 'id' a 'projectId'
      const { estado } = req.body;

      // Verificar que el ID no sea undefined
      if (!projectId) {
        return res.status(400).json({ success: false, message: 'ID de proyecto requerido.' });
      }

      // Validar estado
      const validStates = ['borrador', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'en_desarrollo', 'finalizado'];
      if (!validStates.includes(estado)) {
        return res.status(400).json({ success: false, message: 'Estado no válido.' });
      }

      // Verificar que el proyecto existe
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' });
      }

      // Actualizar estado usando updateStatus del modelo
      await this.projectModel.updateStatus(projectId, estado);
      
      res.json({ success: true, message: 'Estado del proyecto actualizado exitosamente.' });
    } catch (error) {
      console.error('Error changing project status:', error);
      res.status(500).json({ success: false, message: 'Error al cambiar el estado del proyecto.' });
    }
  }

  // Completar proyecto
  async completeProject(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { projectId } = req.params;
      
      // Verificar que el ID no sea undefined
      if (!projectId) {
        return res.status(400).json({ success: false, message: 'ID de proyecto requerido.' });
      }

      // Verificar que el proyecto existe
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' });
      }

      // Verificar que el proyecto no esté ya finalizado
      if (project.estado === 'finalizado') {
        return res.status(400).json({ success: false, message: 'El proyecto ya está finalizado.' });
      }

      // Actualizar estado a finalizado y establecer fecha de finalización
      const updateData = {
        estado: 'finalizado',
        fecha_finalizacion: new Date()
      };
      
      await this.projectModel.update(projectId, updateData);
      
      res.json({ success: true, message: 'Proyecto completado exitosamente.' });
    } catch (error) {
      console.error('Error completing project:', error);
      res.status(500).json({ success: false, message: 'Error al completar el proyecto.' });
    }
  }

  // Obtener detalles del proyecto
  async getProjectDetails(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { projectId } = req.params; // Cambiar de 'id' a 'projectId'
      
      // Verificar que el ID no sea undefined
      if (!projectId) {
        return res.status(400).json({ success: false, message: 'ID de proyecto requerido.' });
      }
      
      // Obtener proyecto con detalles usando findWithDetails con condición
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      if (!projects || projects.length === 0) {
        return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' });
      }
      
      const project = projects[0];
      res.json({ success: true, project });
    } catch (error) {
      console.error('Error getting project details:', error);
      res.status(500).json({ success: false, message: 'Error al obtener los detalles del proyecto.' });
    }
  }

  // Eliminar proyecto
  async deleteProject(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { projectId } = req.params;
      
      // Verificar que el ID no sea undefined
      if (!projectId) {
        return res.status(400).json({ success: false, message: 'ID de proyecto requerido.' });
      }
      
      // Verificar que el proyecto existe
      const project = await this.projectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ success: false, message: 'Proyecto no encontrado.' });
      }

      // Obtener entregables asociados
      const deliverables = await this.entregableModel.findByProject(projectId);
      
      // Eliminar entregables asociados primero
      if (deliverables && deliverables.length > 0) {
        console.log(`Eliminando ${deliverables.length} entregables del proyecto ${projectId}`);
        for (const deliverable of deliverables) {
          await this.entregableModel.delete(deliverable.id);
        }
      }

      // Eliminar otras dependencias del proyecto
      const db = this.projectModel.db;
      
      // Eliminar asignaciones de usuarios
      await db.execute('DELETE FROM proyecto_usuarios WHERE proyecto_id = ?', [projectId]);
      
      // Eliminar invitaciones
      await db.execute('DELETE FROM invitaciones WHERE proyecto_id = ?', [projectId]);
      
      // Eliminar comentarios del proyecto
      await db.execute('DELETE FROM proyecto_comentarios WHERE proyecto_id = ?', [projectId]);

      // Finalmente eliminar el proyecto
      await this.projectModel.delete(projectId);

      res.json({ 
        success: true, 
        message: `Proyecto eliminado exitosamente junto con ${deliverables.length} entregables asociados.` 
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar el proyecto.' });
    }
  }

  // Método para mostrar reportes del sistema
  async reports(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Obtener estadísticas de usuarios
      const allUsers = await this.userModel.findWithRole();
      const userStats = {
        total: allUsers.length,
        active: allUsers.filter(u => u.activo).length,
        inactive: allUsers.filter(u => !u.activo).length,
        byRole: {}
      };
      
      // Contar usuarios por rol
      allUsers.forEach(user => {
        const roleName = user.rol_nombre || 'Sin rol';
        userStats.byRole[roleName] = (userStats.byRole[roleName] || 0) + 1;
      });

      // Obtener estadísticas de proyectos filtradas por área de trabajo
      const areaFilter = req.areaTrabajoId ? { area_trabajo_id: req.areaTrabajoId } : {};
      const allProjects = await this.projectModel.findWithDetails(areaFilter);
      const projectStats = {
        total: allProjects.length,
        active: allProjects.filter(p => p.estado === 'Activo').length,
        completed: allProjects.filter(p => p.estado === 'Completado').length,
        pending: allProjects.filter(p => p.estado === 'Pendiente').length,
        cancelled: allProjects.filter(p => p.estado === 'Cancelado').length,
        byLine: {},
        byCycle: {}
      };
      
      // Contar proyectos por línea de investigación
      allProjects.forEach(project => {
        const line = project.linea_nombre || 'Sin línea';
        projectStats.byLine[line] = (projectStats.byLine[line] || 0) + 1;
        
        const cycle = project.ciclo_nombre || 'Sin ciclo';
        projectStats.byCycle[cycle] = (projectStats.byCycle[cycle] || 0) + 1;
      });

      // Obtener estadísticas de entregables
      const allDeliverables = await this.entregableModel.findWithProject();
      const deliverableStats = {
        total: allDeliverables.length,
        pending: allDeliverables.filter(d => d.estado === 'Pendiente').length,
        inProgress: allDeliverables.filter(d => d.estado === 'En Progreso').length,
        completed: allDeliverables.filter(d => d.estado === 'Completado').length,
        overdue: allDeliverables.filter(d => {
          const today = new Date();
          const dueDate = new Date(d.fecha_limite);
          return dueDate < today && d.estado !== 'Completado';
        }).length
      };

      // Obtener estadísticas de roles
      const allRoles = await this.roleModel.findAll();
      const roleStats = {
        total: allRoles.length,
        active: allRoles.filter(r => r.activo).length,
        inactive: allRoles.filter(r => !r.activo).length
      };

      // Datos para gráficos (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const recentProjects = allProjects.filter(p => {
        const createdDate = new Date(p.fecha_creacion);
        return createdDate >= sixMonthsAgo;
      });
      
      const recentDeliverables = allDeliverables.filter(d => {
        const createdDate = new Date(d.fecha_creacion);
        return createdDate >= sixMonthsAgo;
      });

      // Actividad mensual
      const monthlyActivity = {
        projects: {},
        deliverables: {}
      };
      
      // Generar datos mensuales
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyActivity.projects[monthKey] = 0;
        monthlyActivity.deliverables[monthKey] = 0;
      }
      
      recentProjects.forEach(project => {
        const date = new Date(project.fecha_creacion);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyActivity.projects[monthKey] !== undefined) {
          monthlyActivity.projects[monthKey]++;
        }
      });
      
      recentDeliverables.forEach(deliverable => {
        const date = new Date(deliverable.fecha_creacion);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthlyActivity.deliverables[monthKey] !== undefined) {
          monthlyActivity.deliverables[monthKey]++;
        }
      });

      res.render('admin/reports', {
        title: 'Reportes del Sistema',
        user,
        userStats,
        projectStats,
        deliverableStats,
        roleStats,
        monthlyActivity,
        recentProjects: recentProjects.slice(0, 10),
        recentDeliverables: recentDeliverables.slice(0, 10),
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin reports:', error);
      req.flash('error', 'Error al cargar los reportes');
      res.redirect('/dashboard/admin');
    }
  }

  // Método para realizar respaldos de la base de datos en JSON
  async backup(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para realizar respaldos.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Tablas a respaldar
      const tables = [
        'usuarios', 'roles', 'areas_trabajo', 'usuario_areas_trabajo',
        'proyectos', 'proyecto_usuarios', 'project_invitations', 'invitaciones',
        'entregables', 'entregable_comentarios', 'proyecto_comentarios',
        'notificaciones', 'evaluaciones', 'tarea_comentarios', 'tarea_historial',
        'historial_area_trabajo', 'lineas_investigacion', 'ciclos_academicos'
      ];

      const backupData = {};
      for (const table of tables) {
        try {
          const [rows] = await pool.execute(`SELECT * FROM ${table}`);
          backupData[table] = rows;
        } catch (err) {
          console.warn(`No se pudo exportar la tabla ${table}: ${err.message}`);
          backupData[table] = { error: err.message };
        }
      }

      // Directorio de respaldos
      const backupDir = path.join(__dirname, '..', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Nombre de archivo con timestamp
      const ts = new Date();
      const fileName = `backup-${ts.getFullYear()}${String(ts.getMonth() + 1).padStart(2, '0')}${String(ts.getDate()).padStart(2, '0')}-${String(ts.getHours()).padStart(2, '0')}${String(ts.getMinutes()).padStart(2, '0')}${String(ts.getSeconds()).padStart(2, '0')}.json`;
      const filePath = path.join(backupDir, fileName);

      // Escribir archivo JSON
      fs.writeFileSync(filePath, JSON.stringify({
        metadata: {
          created_at: ts.toISOString(),
          db_name: process.env.DB_NAME || 'unknown',
          host: process.env.DB_HOST || 'localhost',
          user: user.email || user.username || user.nombre || 'admin'
        },
        data: backupData
      }, null, 2), 'utf-8');

      // Enviar para descarga
      return res.download(filePath, fileName, (err) => {
        if (err) {
          console.error('Error al descargar el respaldo:', err);
          req.flash('error', 'Respaldo creado pero no se pudo iniciar la descarga.');
          return res.redirect('/admin/settings');
        }
      });
    } catch (error) {
      console.error('Error al crear respaldo:', error);
      req.flash('error', 'Error al crear el respaldo.');
      return res.redirect('/admin/settings');
    }
  }

  // Método para gestionar configuraciones del sistema
  async settings(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }
  
      // Obtener configuraciones actuales del sistema
      const systemConfig = {
        // Configuraciones generales
        siteName: process.env.SITE_NAME || 'Sistema Académico',
        siteDescription: process.env.SITE_DESCRIPTION || 'Sistema de gestión académica',
        adminEmail: process.env.ADMIN_EMAIL || 'admin@sistema.edu',
        
        // Configuraciones de base de datos
        dbHost: process.env.DB_HOST || 'localhost',
        dbName: process.env.DB_NAME || 'sistema_academico',
        
        // Configuraciones de archivos
        maxFileSize: process.env.MAX_FILE_SIZE || '10MB',
        allowedFileTypes: process.env.ALLOWED_FILE_TYPES || 'pdf,doc,docx,jpg,png',
        
        // Configuraciones de notificaciones
        emailNotifications: process.env.EMAIL_NOTIFICATIONS === 'true',
        smsNotifications: process.env.SMS_NOTIFICATIONS === 'true',
        
        // Configuraciones de seguridad
        sessionTimeout: process.env.SESSION_TIMEOUT || '30',
        passwordMinLength: process.env.PASSWORD_MIN_LENGTH || '8',
        requirePasswordChange: process.env.REQUIRE_PASSWORD_CHANGE === 'true',
        
        // Configuraciones académicas
        defaultProjectDuration: process.env.DEFAULT_PROJECT_DURATION || '12',
        evaluationDeadlineDays: process.env.EVALUATION_DEADLINE_DAYS || '7',
        autoAssignEvaluators: process.env.AUTO_ASSIGN_EVALUATORS === 'true'
      };
  
      // Obtener estadísticas del sistema para mostrar en configuración
      const systemStats = {
        totalUsers: (await this.userModel.findWithRole()).length,
        totalProjects: (await this.projectModel.findAll()).length,
        totalRoles: (await this.roleModel.findAll()).length,
        diskUsage: '0 MB', // Placeholder - se puede implementar cálculo real
        lastBackup: 'No disponible'
      };

      // Calcular fecha del último respaldo
      try {
        const backupDir = path.join(__dirname, '..', 'backups');
        if (fs.existsSync(backupDir)) {
          const files = fs.readdirSync(backupDir)
            .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
            .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime }))
            .sort((a, b) => b.time - a.time);
          if (files.length > 0) {
            systemStats.lastBackup = files[0].time.toISOString();
          }
        }
      } catch (e) {
        console.warn('No se pudo obtener la fecha del último respaldo:', e.message);
      }
  
      res.render('admin/settings', {
        title: 'Configuración del Sistema',
        user,
        systemConfig,
        systemStats,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin settings:', error);
      req.flash('error', 'Error al cargar la configuración del sistema');
      res.redirect('/dashboard/admin');
    }
  }

  // Método para actualizar configuraciones del sistema
  async updateSettings(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }
  
      const {
        siteName,
        siteDescription,
        adminEmail,
        maxFileSize,
        allowedFileTypes,
        emailNotifications,
        smsNotifications,
        sessionTimeout,
        passwordMinLength,
        requirePasswordChange,
        defaultProjectDuration,
        evaluationDeadlineDays,
        autoAssignEvaluators
      } = req.body;
  
      // Validar datos requeridos
      if (!siteName || !adminEmail) {
        return res.status(400).json({ success: false, message: 'Nombre del sitio y email del administrador son requeridos.' });
      }
  
      // Aquí se implementaría la lógica para actualizar las configuraciones
      // Por ahora, solo simulamos la actualización exitosa
      // En una implementación real, se guardarían en base de datos o archivo de configuración
      
      req.flash('success', 'Configuraciones actualizadas exitosamente.');
      res.json({ success: true, message: 'Configuraciones actualizadas exitosamente.' });
    } catch (error) {
      console.error('Error updating settings:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar las configuraciones.' });
    }
  }

  // =============================================
  // MÉTODOS DEL CALENDARIO DE TAREAS
  // =============================================

  // Mostrar página del calendario
  async calendar(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Obtener proyectos activos para el selector
      const projects = await this.projectModel.findAll();
      const activeProjects = projects.filter(p => p.activo);

      res.render('admin/calendar', {
        title: 'Calendario de Tareas',
        user,
        projects: activeProjects,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin calendar:', error);
      req.flash('error', 'Error al cargar el calendario de tareas');
      res.redirect('/dashboard/admin');
    }
  }

  // Obtener tareas para el calendario
  async getCalendarTasks(req, res) {
    try {
      const { start, end, priority } = req.query;
      
      // Obtener tareas con detalles
      const tasks = await this.taskModel.findWithDetails();
      
      // Filtrar por rango de fechas si se proporciona
      let filteredTasks = tasks;
      if (start && end) {
        const startDate = new Date(start);
        const endDate = new Date(end);
        filteredTasks = tasks.filter(task => {
          const taskDate = new Date(task.fecha_limite);
          return taskDate >= startDate && taskDate <= endDate;
        });
      }
      
      // Filtrar por prioridad si se proporciona
      if (priority && priority !== 'all') {
        filteredTasks = filteredTasks.filter(task => task.prioridad === priority);
      }
      
      // Formatear tareas para el calendario
      const calendarTasks = filteredTasks.map(task => ({
        id: task.id,
        title: task.titulo,
        description: task.descripcion,
        start: task.fecha_limite,
        priority: task.prioridad,
        status: task.estado,
        project: {
          id: task.proyecto_id,
          name: task.proyecto_titulo
        },
        assignee: {
          name: `${task.asignado_nombre || ''} ${task.asignado_apellido || ''}`.trim(),
          email: task.asignado_email,
          avatar: task.asignado_avatar
        },
        type: task.tipo || 'task'
      }));
      
      res.json({ success: true, tasks: calendarTasks });
    } catch (error) {
      console.error('Error getting calendar tasks:', error);
      res.status(500).json({ success: false, message: 'Error al obtener las tareas' });
    }
  }

  // Crear nueva tarea
  async createCalendarTask(req, res) {
    try {
      const { title, description, date, time, priority, type, project_id } = req.body;
      
      // Validar campos requeridos
      if (!title || !date || !project_id) {
        return res.status(400).json({ 
          success: false, 
          message: 'Título, fecha y proyecto son requeridos' 
        });
      }
      
      // Combinar fecha y hora
      const dateTime = time ? `${date} ${time}` : `${date} 23:59:59`;
      
      // Obtener fase por defecto (primera fase activa)
      const fases = await new BaseModel('fases_proyecto').findAll();
      const defaultFase = fases.find(f => f.activo) || fases[0];
      
      const taskData = {
        proyecto_id: parseInt(project_id),
        fase_id: defaultFase?.id || 1,
        titulo: title,
        descripcion: description || '',
        fecha_limite: dateTime,
        tipo_enfoque: type || 'task'
      };
      
      const taskId = await this.taskModel.createTask(taskData);
      
      // Obtener la tarea creada con detalles
      const newTask = await this.taskModel.findById(taskId);
      
      res.json({ 
        success: true, 
        message: 'Tarea creada exitosamente',
        task: {
          id: newTask.id,
          title: newTask.titulo,
          description: newTask.descripcion,
          start: newTask.fecha_limite,
          priority: priority || 'medium',
          status: newTask.estado,
          type: type || 'task'
        }
      });
    } catch (error) {
      console.error('Error creating calendar task:', error);
      res.status(500).json({ success: false, message: 'Error al crear la tarea' });
    }
  }

  // Actualizar tarea
  async updateCalendarTask(req, res) {
    try {
      const { taskId } = req.params;
      const { title, description, date, time, priority, type, project_id } = req.body;
      
      // Validar que la tarea existe
      const existingTask = await this.taskModel.findById(taskId);
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      
      // Preparar datos de actualización
      const updateData = {};
      if (title) updateData.titulo = title;
      if (description !== undefined) updateData.descripcion = description;
      if (project_id) updateData.proyecto_id = parseInt(project_id);
      if (date) {
        const dateTime = time ? `${date} ${time}` : `${date} 23:59:59`;
        updateData.fecha_limite = dateTime;
      }
      
      // Actualizar en base de datos
      await this.taskModel.update(taskId, updateData);
      
      res.json({ 
        success: true, 
        message: 'Tarea actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error updating calendar task:', error);
      res.status(500).json({ success: false, message: 'Error al actualizar la tarea' });
    }
  }

  // Eliminar tarea
  async deleteCalendarTask(req, res) {
    try {
      const { taskId } = req.params;
      
      // Validar que la tarea existe
      const existingTask = await this.taskModel.findById(taskId);
      if (!existingTask) {
        return res.status(404).json({ success: false, message: 'Tarea no encontrada' });
      }
      
      // Eliminar tarea
      await this.taskModel.delete(taskId);
      
      res.json({ 
        success: true, 
        message: 'Tarea eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting calendar task:', error);
      res.status(500).json({ success: false, message: 'Error al eliminar la tarea' });
    }
  }

  // =============================================
  // MÉTODOS DE GESTIÓN DE INVITACIONES
  // =============================================

  // Mostrar página de gestión de invitaciones
  async invitations(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      // Obtener todos los proyectos para el selector
      const projects = await this.projectModel.findAll();
      
      // Obtener estadísticas generales de invitaciones
      const totalInvitations = await this.projectModel.countAllInvitations();
      const activeInvitations = await this.projectModel.countActiveInvitations();
      const totalMembers = await this.projectModel.countAllMembers();
      
      const stats = {
        total: totalInvitations,
        active: activeInvitations,
        expired: totalInvitations - activeInvitations,
        members: totalMembers
      };

      res.render('admin/invitations', {
        title: 'Gestión de Invitaciones',
        user,
        projects: projects || [],
        stats,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in admin invitations:', error);
      req.flash('error', 'Error al cargar la gestión de invitaciones');
      res.redirect('/dashboard/admin');
    }
  }

  // Obtener invitaciones de un proyecto específico
  async getProjectInvitations(req, res) {
    try {
      const { projectId } = req.params;
      const { status, search } = req.query;
      
      // Obtener invitaciones del proyecto con filtros
      const invitations = await this.projectModel.getProjectInvitations(projectId, {
        status,
        search
      });
      
      res.json({
        success: true,
        data: invitations
      });
    } catch (error) {
      console.error('Error getting project invitations:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las invitaciones del proyecto'
      });
    }
  }

  // Crear nueva invitación
  async createInvitation(req, res) {
    try {
      const { proyecto_id, max_usos, fecha_expiracion, descripcion } = req.body;
      const user = req.session.user;
      
      // Validar datos requeridos
      if (!proyecto_id || !max_usos) {
        return res.status(400).json({
          success: false,
          message: 'Proyecto y máximo de usos son requeridos'
        });
      }
      
      // Crear la invitación
      const invitationData = {
        proyecto_id: parseInt(proyecto_id),
        creado_por_id: user.id,
        max_usos: parseInt(max_usos),
        fecha_expiracion: fecha_expiracion || null,
        descripcion: descripcion || null
      };
      
      const invitation = await this.projectModel.createInvitation(invitationData);
      
      res.json({
        success: true,
        message: 'Código de invitación creado exitosamente',
        data: invitation
      });
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Error al crear el código de invitación'
      });
    }
  }

  // Actualizar invitación (activar/desactivar)
  async updateInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      const { activo, max_usos, fecha_expiracion, descripcion } = req.body;
      
      const updateData = {};
      if (typeof activo !== 'undefined') updateData.activo = activo;
      if (max_usos) updateData.max_usos = parseInt(max_usos);
      if (fecha_expiracion !== undefined) updateData.fecha_expiracion = fecha_expiracion;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      
      await this.projectModel.updateInvitation(invitationId, updateData);
      
      res.json({
        success: true,
        message: 'Invitación actualizada exitosamente'
      });
    } catch (error) {
      console.error('Error updating invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Error al actualizar la invitación'
      });
    }
  }

  // Eliminar invitación
  async deleteInvitation(req, res) {
    try {
      const { invitationId } = req.params;
      
      await this.projectModel.deleteInvitation(invitationId);
      
      res.json({
        success: true,
        message: 'Invitación eliminada exitosamente'
      });
    } catch (error) {
      console.error('Error deleting invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Error al eliminar la invitación'
      });
    }
  }

  // Obtener estadísticas de invitaciones de un proyecto
  async getInvitationStats(req, res) {
    try {
      const { projectId } = req.params;
      
      const stats = await this.projectModel.getInvitationStats(projectId);
      
      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('Error getting invitation stats:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener las estadísticas'
      });
    }
  }

  // Obtener miembros de un proyecto
  async getProjectMembers(req, res) {
    try {
      const { projectId } = req.params;
      
      const members = await this.projectModel.getProjectMembers(projectId);
      
      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error('Error getting project members:', error);
      res.status(500).json({
        success: false,
        message: 'Error al obtener los miembros del proyecto'
      });
    }
  }

  // Remover miembro de un proyecto
  async removeMember(req, res) {
    try {
      console.log('🔍 [BACKEND] removeMember llamado');
      console.log('🔍 [BACKEND] Parámetros recibidos:', req.params);
      console.log('🔍 [BACKEND] Usuario en sesión:', req.session.user ? req.session.user.id : 'No hay sesión');
      
      const user = req.session.user;
      const { projectId, userId } = req.params;
      
      console.log('🔍 [BACKEND] ProjectId:', projectId, 'UserId:', userId);

      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        console.log('❌ [BACKEND] Permisos insuficientes:', user ? user.rol_nombre : 'Sin usuario');
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para realizar esta acción.' 
        });
      }

      console.log('✅ [BACKEND] Permisos verificados correctamente');

      // Verificar que el proyecto existe
      const project = await this.projectModel.findById(projectId);
      console.log('🔍 [BACKEND] Proyecto encontrado:', project ? 'Sí' : 'No');
      
      if (!project) {
        console.log('❌ [BACKEND] Proyecto no encontrado');
        return res.status(404).json({ 
          success: false, 
          message: 'Proyecto no encontrado.' 
        });
      }

      // Verificar que el usuario es miembro del proyecto
      console.log('🔍 [BACKEND] Verificando membresía del usuario...');
      const member = await this.projectModel.query(`
        SELECT * FROM proyecto_usuarios 
        WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'
      `, [projectId, userId]);

      console.log('🔍 [BACKEND] Resultado de búsqueda de miembro:', member);

      if (!member || member.length === 0) {
        console.log('❌ [BACKEND] Usuario no es miembro activo');
        return res.status(404).json({ 
          success: false, 
          message: 'El usuario no es miembro activo de este proyecto.' 
        });
      }

      console.log('✅ [BACKEND] Usuario es miembro activo, procediendo a desactivar...');

      // Desactivar la membresía en lugar de eliminarla
      const updateResult = await this.projectModel.query(`
        UPDATE proyecto_usuarios 
        SET estado = 'inactivo'
        WHERE proyecto_id = ? AND usuario_id = ?
      `, [projectId, userId]);

      console.log('🔍 [BACKEND] Resultado de actualización:', updateResult);
      console.log('✅ [BACKEND] Miembro desactivado exitosamente');

      res.json({ 
        success: true, 
        message: 'Miembro removido exitosamente del proyecto.' 
      });
    } catch (error) {
      console.error('💥 [BACKEND] Error removing project member:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al remover el miembro del proyecto.' 
      });
    }
  }

  // Reactivar miembro del proyecto (cambiar de inactivo a activo)
  async reactivateMember(req, res) {
    try {
      console.log('🔍 [BACKEND] reactivateMember llamado');
      console.log('🔍 [BACKEND] Parámetros recibidos:', req.params);
      console.log('🔍 [BACKEND] Usuario en sesión:', req.session.user ? req.session.user.id : 'No hay sesión');
      
      const user = req.session.user;
      const { projectId, userId } = req.params;
      
      console.log('🔍 [BACKEND] ProjectId:', projectId, 'UserId:', userId);

      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        console.log('❌ [BACKEND] Permisos insuficientes:', user ? user.rol_nombre : 'Sin usuario');
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para realizar esta acción.' 
        });
      }

      console.log('✅ [BACKEND] Permisos verificados correctamente');

      // Verificar que el proyecto existe
      const project = await this.projectModel.findById(projectId);
      console.log('🔍 [BACKEND] Proyecto encontrado:', project ? 'Sí' : 'No');
      
      if (!project) {
        console.log('❌ [BACKEND] Proyecto no encontrado');
        return res.status(404).json({ 
          success: false, 
          message: 'Proyecto no encontrado.' 
        });
      }

      // Verificar que el usuario es miembro inactivo del proyecto
      console.log('🔍 [BACKEND] Verificando membresía inactiva del usuario...');
      const member = await this.projectModel.query(`
        SELECT * FROM proyecto_usuarios 
        WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'inactivo'
      `, [projectId, userId]);

      console.log('🔍 [BACKEND] Resultado de búsqueda de miembro inactivo:', member);

      if (!member || member.length === 0) {
        console.log('❌ [BACKEND] Usuario no es miembro inactivo');
        return res.status(404).json({ 
          success: false, 
          message: 'El usuario no es miembro inactivo de este proyecto.' 
        });
      }

      console.log('✅ [BACKEND] Usuario es miembro inactivo, procediendo a reactivar...');

      // Reactivar la membresía
      const updateResult = await this.projectModel.query(`
        UPDATE proyecto_usuarios 
        SET estado = 'activo'
        WHERE proyecto_id = ? AND usuario_id = ?
      `, [projectId, userId]);

      console.log('🔍 [BACKEND] Resultado de reactivación:', updateResult);
      console.log('✅ [BACKEND] Miembro reactivado exitosamente');

      res.json({ 
        success: true, 
        message: 'Miembro reactivado exitosamente en el proyecto.' 
      });
    } catch (error) {
      console.error('💥 [BACKEND] Error reactivating project member:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error al reactivar el miembro del proyecto.' 
      });
    }
  }

  // Mostrar página de detalles del proyecto (nueva función)
  async showProjectDetails(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      const { projectId } = req.params;
      
      // Obtener proyecto con detalles
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      if (!projects || projects.length === 0) {
        req.flash('error', 'Proyecto no encontrado.');
        return res.redirect('/admin/projects');
      }
      
      const project = projects[0];
      
      // Obtener datos adicionales
      const members = await this.projectModel.getProjectMembers(projectId);
      const inactiveMembers = await this.projectModel.query(`
        SELECT 
          pu.*,
          u.nombres,
          u.apellidos,
          u.email,
          u.codigo_usuario,
          r.nombre as rol_nombre
        FROM proyecto_usuarios pu
        LEFT JOIN usuarios u ON pu.usuario_id = u.id
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE pu.proyecto_id = ? AND pu.estado = 'inactivo'
        ORDER BY pu.fecha_asignacion ASC
      `, [projectId]);
      const invitations = await this.projectModel.getProjectInvitations(projectId);
      const tasksGrouped = await this.taskModel.getProjectTasksWithWorkflow(projectId);
      const tasks = [...tasksGrouped.todo, ...tasksGrouped.in_progress, ...tasksGrouped.done];
      const deliverables = await this.entregableModel.findByProject(projectId);
      
      // Obtener fases del proyecto
      const fases = await this.projectModel.query(`
        SELECT id, nombre, descripcion, orden
        FROM fases_proyecto
        WHERE activo = TRUE
        ORDER BY orden ASC
      `);
      
      // Calcular progreso del proyecto basado en tareas completadas
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => 
        task.estado === 'completado' || 
        task.estado === 'aprobado' || 
        task.estado === 'revisado' ||
        task.estado === 'completada' ||
        task.estado === 'done'
      ).length;
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Crear eventos del timeline ordenados cronológicamente
      const timelineEvents = [];
      
      // Evento de creación del proyecto
      if (project.created_at) {
        timelineEvents.push({
          date: new Date(project.created_at),
          type: 'project',
          title: 'Proyecto Creado',
          description: `El proyecto "${project.titulo}" fue creado.`,
          icon: 'flag',
          tag: 'project-tag',
          tagText: 'Proyecto'
        });
      }
      
      // Eventos de miembros uniéndose
      members.forEach(member => {
        const joinDate = member.fecha_asignacion || project.created_at;
        if (joinDate) {
          timelineEvents.push({
            date: new Date(joinDate),
            type: 'members',
            title: 'Miembro Agregado',
            description: `${member.nombres} ${member.apellidos} se unió como ${member.rol}.`,
            icon: 'user-plus',
            tag: 'member-tag',
            tagText: 'Miembro',
            role: member.rol
          });
        }
      });
      
      // Eventos de tareas
      tasks.forEach(task => {
        if (task.created_at) {
          timelineEvents.push({
            date: new Date(task.created_at),
            type: 'tasks',
            title: task.estado === 'completado' || task.estado === 'done' || task.estado === 'aprobado' ? 'Tarea Completada' : 'Tarea Creada',
            description: task.titulo,
            icon: task.estado === 'completado' || task.estado === 'done' || task.estado === 'aprobado' ? 'check' : 'plus',
            tag: 'task-tag',
            tagText: 'Tarea',
            priority: task.prioridad,
            assignee: task.asignado_nombres ? `${task.asignado_nombres} ${task.asignado_apellidos}` : null
          });
        }
      });
      
      // Eventos de entregables
      deliverables.forEach(deliverable => {
        if (deliverable.created_at) {
          timelineEvents.push({
            date: new Date(deliverable.created_at),
            type: 'deliverables',
            title: 'Entregable Creado',
            description: deliverable.titulo,
            icon: 'file-alt',
            tag: 'deliverable-tag',
            tagText: 'Entregable'
          });
        }
        
        if (deliverable.fecha_entrega && (deliverable.estado === 'entregado' || deliverable.estado === 'en_revision' || deliverable.estado === 'aprobado')) {
          timelineEvents.push({
            date: new Date(deliverable.fecha_entrega),
            type: 'deliverables',
            title: deliverable.estado === 'aprobado' ? 'Entregable Aprobado' : 'Entregable Enviado',
            description: `Entregable "${deliverable.titulo}" fue ${deliverable.estado === 'aprobado' ? 'aprobado' : 'enviado'}.`,
            icon: deliverable.estado === 'aprobado' ? 'check-circle' : 'paper-plane',
            tag: 'deliverable-tag',
            tagText: 'Entregable'
          });
        }
      });
      
      // Ordenar eventos por fecha
      timelineEvents.sort((a, b) => a.date - b.date);
      
      res.render('admin/project-detail', {
        title: `Admin: ${project.titulo}`,
        user,
        project,
        members,
        inactiveMembers,
        invitations,
        tasks,
        tasksGrouped,
        deliverables,
        fases,
        progress,
        timelineEvents,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error showing project details:', error);
      req.flash('error', 'Error al cargar los detalles del proyecto');
      res.redirect('/admin/projects');
    }
  }

  // Mostrar formulario para editar proyecto
  async showEditProject(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect(DashboardHelper.getDashboardRouteFromUser(user));
      }

      const { projectId } = req.params;
      
      // Obtener proyecto con detalles
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      if (!projects || projects.length === 0) {
        req.flash('error', 'Proyecto no encontrado.');
        return res.redirect('/admin/projects');
      }
      
      const project = projects[0];
      
      // Obtener datos necesarios para el formulario
      const lineasInvestigacion = await this.lineasInvestigacionModel.findAll();
      const ciclosAcademicos = await this.ciclosAcademicosModel.findAll();
      
      // Obtener usuarios para asignar como directores/estudiantes
      const allUsers = await this.userModel.findWithRole();
      const directores = allUsers.filter(user => 
          user.rol_nombre === 'Director de Proyecto' || 
          user.rol_nombre === 'Administrador General'
      );
      const estudiantes = allUsers.filter(u => u.rol_nombre === 'Estudiante');
      
      res.render('admin/project-edit', {
        title: `Editar Proyecto: ${project.titulo}`,
        user,
        project,
        lineasInvestigacion,
        ciclosAcademicos,
        directores,
        estudiantes,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error showing edit project:', error);
      req.flash('error', 'Error al cargar el formulario de edición');
      res.redirect('/admin/projects');
    }
  }

  // =============================================
  // GESTIÓN DE ENTREGABLES
  // =============================================

  async deliverables(req, res) {
    try {
      const user = req.session.user;
      const filter = req.query.filter; // 'overdue', 'pending', 'completed', etc.
      
      let deliverables = [];
      const conditions = {};
      
      // Filtrar por área de trabajo si el usuario no es Administrador General
      if (user.rol_nombre !== 'Administrador General' && req.areaTrabajoId) {
        conditions.area_trabajo_id = req.areaTrabajoId;
      }
      
      if (filter === 'overdue') {
        deliverables = await this.entregableModel.findOverdue();
        // Filtrar por área si es necesario
        if (conditions.area_trabajo_id) {
          deliverables = deliverables.filter(d => d.area_trabajo_id === conditions.area_trabajo_id);
        }
      } else if (filter === 'pending') {
        deliverables = await this.entregableModel.findPending();
        // Filtrar por área si es necesario
        if (conditions.area_trabajo_id) {
          deliverables = deliverables.filter(d => d.area_trabajo_id === conditions.area_trabajo_id);
        }
      } else {
        // Obtener todos los entregables con información del proyecto
        deliverables = await this.entregableModel.findWithProject(conditions);
      }
      
      // Calcular días vencidos para entregables vencidos
      deliverables = deliverables.map(deliverable => {
        const today = new Date();
        const dueDate = new Date(deliverable.fecha_entrega);
        const diffTime = today - dueDate;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return {
          ...deliverable,
          dias_vencido: diffDays > 0 && deliverable.estado === 'pendiente' ? diffDays : 0,
          is_overdue: diffDays > 0 && deliverable.estado === 'pendiente'
        };
      });
      
      res.render('admin/deliverables', {
        title: 'Gestión de Entregables',
        user,
        deliverables,
        filter: filter || 'all',
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in deliverables:', error);
      req.flash('error', 'Error al cargar los entregables');
      res.redirect('/dashboard/admin');
    }
  }

  async showDeliverableDetails(req, res) {
    try {
      const user = req.session.user;
      const deliverableId = req.params.deliverableId;
      
      // Obtener detalles del entregable
      const deliverable = await this.entregableModel.findById(deliverableId);
      
      if (!deliverable) {
        req.flash('error', 'Entregable no encontrado');
        return res.redirect('/admin/deliverables');
      }
      
      // Obtener información del proyecto asociado
      const project = await this.projectModel.findById(deliverable.proyecto_id);
      
      // Calcular días vencidos si aplica
      const today = new Date();
      const dueDate = new Date(deliverable.fecha_entrega);
      const diffTime = today - dueDate;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const deliverableWithDetails = {
        ...deliverable,
        project,
        dias_vencido: diffDays > 0 && deliverable.estado === 'pendiente' ? diffDays : 0,
        is_overdue: diffDays > 0 && deliverable.estado === 'pendiente'
      };
      
      res.render('admin/deliverable-detail', {
        title: `Entregable: ${deliverable.titulo}`,
        user,
        deliverable: deliverableWithDetails,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in showDeliverableDetails:', error);
      req.flash('error', 'Error al cargar los detalles del entregable');
      res.redirect('/admin/deliverables');
    }
  }

  async updateDeliverableStatus(req, res) {
    try {
      const deliverableId = req.params.deliverableId;
      const { estado, comentarios } = req.body;
      
      const result = await this.entregableModel.update(deliverableId, {
        estado,
        comentarios,
        fecha_actualizacion: new Date()
      });
      
      if (result.affectedRows > 0) {
        req.flash('success', 'Estado del entregable actualizado correctamente');
      } else {
        req.flash('error', 'No se pudo actualizar el estado del entregable');
      }
      
      res.redirect(`/admin/deliverables/${deliverableId}`);
    } catch (error) {
      console.error('Error in updateDeliverableStatus:', error);
      req.flash('error', 'Error al actualizar el estado del entregable');
      res.redirect('/admin/deliverables');
    }
  }

  // =============================================
  // GESTIÓN DE TAREAS - WORKFLOW TIPO JIRA
  // =============================================

  // Mostrar formulario para crear nueva tarea
  async showNewTask(req, res) {
    try {
      const user = req.session.user;
      const { projectId } = req.params;
      
      // Verificar permisos
      if (!user) {
        req.flash('error', 'Debes iniciar sesión para acceder.');
        return res.redirect('/login');
      }

      // Obtener proyecto
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      if (!projects || projects.length === 0) {
        req.flash('error', 'Proyecto no encontrado.');
        return res.redirect('/admin/projects');
      }
      
      const project = projects[0];
      
      // Obtener miembros del proyecto para asignación
      const members = await this.projectModel.getProjectMembers(projectId);
      
      // Obtener fases del proyecto
      const fases = await new BaseModel('fases_proyecto').findAll();
      
      res.render('admin/task-create', {
        title: `Nueva Tarea - ${project.titulo}`,
        user,
        project,
        members,
        fases,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in showNewTask:', error);
      req.flash('error', 'Error al cargar el formulario de nueva tarea');
      res.redirect('/admin/projects');
    }
  }

  // Crear nueva tarea
  async createTask(req, res) {
    try {
      const { projectId } = req.params;
      const {
        titulo,
        descripcion,
        fase_id,
        fecha_limite,
        prioridad,
        asignado_a,
        estimacion_horas,
        etiquetas,
        estado_workflow
      } = req.body;
      const user = req.session.user;
      
      if (!user) {
        req.flash('error', 'Debes iniciar sesión para acceder.');
        return res.redirect('/login');
      }

      if (!titulo || titulo.trim() === '') {
        req.flash('error', 'El título es requerido.');
        return res.redirect(`/admin/projects/${projectId}/tasks/new`);
      }

      // Validar y procesar archivos adjuntos usando FileHelper
      let archivos_adjuntos = [];
      if (req.files && req.files.length > 0) {
        // Validar tipos de archivo
        const typeValidation = FileHelper.validateFileTypes(req.files);
        if (!typeValidation.valid) {
          req.flash('error', `Tipos de archivo no permitidos: ${typeValidation.invalidFiles.map(f => f.nombre).join(', ')}`);
          return res.redirect(`/admin/projects/${projectId}/tasks/new`);
        }

        // Validar tamaños de archivo
        const sizeValidation = FileHelper.validateFileSizes(req.files);
        if (!sizeValidation.valid) {
          let errorMsg = 'Error en archivos: ';
          if (sizeValidation.oversizedFiles.length > 0) {
            errorMsg += `Archivos muy grandes: ${sizeValidation.oversizedFiles.map(f => f.nombre).join(', ')}. `;
          }
          if (sizeValidation.exceedsTotalLimit) {
            errorMsg += `Tamaño total excede el límite permitido.`;
          }
          req.flash('error', errorMsg);
          return res.redirect(`/admin/projects/${projectId}/tasks/new`);
        }

        // Procesar archivos con FileHelper
      archivos_adjuntos = FileHelper.processUploadedFiles(req.files);
    }

    const taskData = {
      proyecto_id: parseInt(projectId),
      fase_id: fase_id ? parseInt(fase_id) : 1,
      titulo: titulo.trim(),
      descripcion: descripcion ? descripcion.trim() : '',
      fecha_limite: fecha_limite || null,
        prioridad: prioridad || 'medium',
        asignado_a: asignado_a || null,
        estimacion_horas: estimacion_horas ? parseFloat(estimacion_horas) : null,
        etiquetas: etiquetas || null,
        estado_workflow: estado_workflow || 'todo',
        archivos_adjuntos: archivos_adjuntos
      };

      const taskId = await this.taskModel.createTask(taskData);
      
      if (taskId) {
        // Registrar en historial
        await this.taskModel.addToHistory(taskId, user.id, 'tarea_creada', {
          descripcion: 'Tarea creada'
        });
        
        req.flash('success', 'Tarea creada exitosamente.');
        res.redirect(`/admin/projects/${projectId}/tasks/kanban`);
      } else {
        req.flash('error', 'Error al crear la tarea.');
        res.redirect(`/admin/projects/${projectId}/tasks/new`);
      }
    } catch (error) {
      console.error('Error in createTask:', error);
      req.flash('error', 'Error al crear la tarea.');
      res.redirect(`/admin/projects/${req.params.projectId}/tasks/new`);
    }
  }

  // Mostrar vista Kanban de tareas
  async showTaskKanban(req, res) {
    try {
      const user = req.session.user;
      const { projectId } = req.params;
      
      // Verificar permisos
      if (!user) {
        req.flash('error', 'Debes iniciar sesión para acceder.');
        return res.redirect('/login');
      }

      // Obtener proyecto
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      if (!projects || projects.length === 0) {
        req.flash('error', 'Proyecto no encontrado.');
        return res.redirect('/admin/projects');
      }
      
      const project = projects[0];
      
      // Obtener tareas agrupadas por estado de workflow
      const tasksGrouped = await this.taskModel.getProjectTasksWithWorkflow(projectId);
      
      // Obtener miembros del proyecto para asignación
      const members = await this.projectModel.getProjectMembers(projectId);
      
      // Obtener fases del proyecto
      const fases = await new BaseModel('fases_proyecto').findAll();
      
      res.render('admin/task-kanban', {
        title: `Tareas - ${project.titulo}`,
        user,
        project,
        tasksGrouped,
        members,
        fases,
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in showTaskKanban:', error);
      req.flash('error', 'Error al cargar el tablero de tareas');
      res.redirect('/admin/projects');
    }
  }

  // API para obtener tareas en formato JSON
  async getTasksAPI(req, res) {
    try {
      const { projectId } = req.params;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const tasksGrouped = await this.taskModel.getProjectTasksWithWorkflow(projectId);
      
      res.json({
        success: true,
        data: tasksGrouped
      });
    } catch (error) {
      console.error('Error in getTasksAPI:', error);
      res.status(500).json({ error: 'Error al obtener las tareas' });
    }
  }

  // API para obtener tareas de un proyecto (alias para compatibilidad con rutas)
  async getProjectTasksAPI(req, res) {
    return this.getTasksAPI(req, res);
  }

  // Actualizar estado de workflow de una tarea
  async updateTaskWorkflowStatus(req, res) {
    try {
      const { taskId } = req.params;
      const { status } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Validar estado
      const validStatuses = ['todo', 'in_progress', 'done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const success = await this.taskModel.updateWorkflowStatus(taskId, status, user.id);
      
      if (success) {
        res.json({ success: true, message: 'Estado actualizado correctamente' });
      } else {
        res.status(400).json({ error: 'No se pudo actualizar el estado' });
      }
    } catch (error) {
      console.error('Error in updateTaskWorkflowStatus:', error);
      res.status(500).json({ error: 'Error al actualizar el estado' });
    }
  }

  // Asignar tarea a usuario
  async assignTask(req, res) {
    try {
      const { taskId } = req.params;
      const { userId } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const success = await this.taskModel.assignTaskToUser(taskId, userId, user.id);
      
      if (success) {
        res.json({ success: true, message: 'Tarea asignada correctamente' });
      } else {
        res.status(400).json({ error: 'No se pudo asignar la tarea' });
      }
    } catch (error) {
      console.error('Error in assignTask:', error);
      res.status(500).json({ error: 'Error al asignar la tarea' });
    }
  }

  // Completar tarea con archivos
  async completeTask(req, res) {
    try {
      const { taskId } = req.params;
      const { desarrollo_descripcion, horas_trabajadas } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Validar y procesar archivos adjuntos usando FileHelper
      let archivos_adjuntos = [];
      if (req.files && req.files.length > 0) {
        // Validar tipos de archivo
        const typeValidation = FileHelper.validateFileTypes(req.files);
        if (!typeValidation.valid) {
          return res.status(400).json({ 
            success: false, 
            message: `Tipos de archivo no permitidos: ${typeValidation.invalidFiles.map(f => f.nombre).join(', ')}` 
          });
        }

        // Validar tamaños de archivo
        const sizeValidation = FileHelper.validateFileSizes(req.files);
        if (!sizeValidation.valid) {
          let errorMsg = 'Error en archivos: ';
          if (sizeValidation.oversizedFiles.length > 0) {
            errorMsg += `Archivos muy grandes: ${sizeValidation.oversizedFiles.map(f => f.nombre).join(', ')}. `;
          }
          if (sizeValidation.exceedsTotalLimit) {
            errorMsg += `Tamaño total excede el límite permitido.`;
          }
          return res.status(400).json({ 
            success: false, 
            message: errorMsg 
          });
        }

        // Procesar archivos con FileHelper
      archivos_adjuntos = FileHelper.processUploadedFiles(req.files);
    }

    const completionData = {
      desarrollo_descripcion,
      archivos_adjuntos,
      horas_trabajadas: parseFloat(horas_trabajadas) || 0
    };

      const success = await this.taskModel.completeTask(taskId, completionData, user.id);
      
      if (success) {
        res.json({ success: true, message: 'Tarea completada correctamente' });
      } else {
        res.status(400).json({ error: 'No se pudo completar la tarea' });
      }
    } catch (error) {
      console.error('Error in completeTask:', error);
      res.status(500).json({ error: 'Error al completar la tarea' });
    }
  }

  // Agregar comentario a tarea
  async addTaskComment(req, res) {
    try {
      const { taskId } = req.params;
      const { comentario, tipo } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      if (!comentario || comentario.trim() === '') {
        return res.status(400).json({ error: 'El comentario no puede estar vacío' });
      }

      // Manejar archivo adjunto si existe
      let archivo_adjunto = null;
      if (req.file) {
        archivo_adjunto = {
          nombre_original: req.file.originalname,
          nombre_archivo: req.file.filename,
          ruta: req.file.path,
          tipo_mime: req.file.mimetype,
          tamaño: req.file.size
        };
      }

      const commentId = await this.taskModel.addComment(
        taskId, 
        user.id, 
        comentario.trim(), 
        tipo || 'comentario',
        archivo_adjunto ? JSON.stringify(archivo_adjunto) : null
      );
      
      if (commentId) {
        res.json({ success: true, message: 'Comentario agregado correctamente', commentId });
      } else {
        res.status(400).json({ error: 'No se pudo agregar el comentario' });
      }
    } catch (error) {
      console.error('Error in addTaskComment:', error);
      res.status(500).json({ error: 'Error al agregar el comentario' });
    }
  }

  // Obtener comentarios de una tarea
  async getTaskComments(req, res) {
    try {
      const { taskId } = req.params;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const comments = await this.taskModel.getComments(taskId);
      
      res.json({ success: true, data: comments });
    } catch (error) {
      console.error('Error in getTaskComments:', error);
      res.status(500).json({ error: 'Error al obtener los comentarios' });
    }
  }

  // Obtener historial de una tarea
  async getTaskHistory(req, res) {
    try {
      const { taskId } = req.params;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const history = await this.taskModel.getHistory(taskId);
      
      res.json({ success: true, data: history });
    } catch (error) {
      console.error('Error in getTaskHistory:', error);
      res.status(500).json({ error: 'Error al obtener el historial' });
    }
  }

  // Crear subtarea
  async createSubtask(req, res) {
    try {
      const { taskId } = req.params;
      const { titulo, descripcion, asignado_a } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      if (!titulo || titulo.trim() === '') {
        return res.status(400).json({ error: 'El título es requerido' });
      }

      const subtaskData = {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : '',
        asignado_a: asignado_a || null
      };

      const subtaskId = await this.taskModel.createSubtask(taskId, subtaskData, user.id);
      
      if (subtaskId) {
        res.json({ success: true, message: 'Subtarea creada correctamente', subtaskId });
      } else {
        res.status(400).json({ error: 'No se pudo crear la subtarea' });
      }
    } catch (error) {
      console.error('Error in createSubtask:', error);
      res.status(500).json({ error: 'Error al crear la subtarea' });
    }
  }

  // Actualizar estado de subtarea
  async updateSubtaskStatus(req, res) {
    try {
      const { subtaskId } = req.params;
      const { status } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Validar estado
      const validStatuses = ['todo', 'in_progress', 'done'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Estado inválido' });
      }

      const success = await this.taskModel.updateSubtaskStatus(subtaskId, status, user.id);
      
      if (success) {
        res.json({ success: true, message: 'Estado de subtarea actualizado correctamente' });
      } else {
        res.status(400).json({ error: 'No se pudo actualizar el estado de la subtarea' });
      }
    } catch (error) {
      console.error('Error in updateSubtaskStatus:', error);
      res.status(500).json({ error: 'Error al actualizar el estado de la subtarea' });
    }
  }

  // Obtener detalles completos de una tarea (para modal)
  async getTaskDetails(req, res) {
    try {
      const { taskId } = req.params;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      const task = await this.taskModel.getTaskDetails(taskId);
      
      if (!task) {
        return res.status(404).json({ error: 'Tarea no encontrada' });
      }

      // Obtener comentarios
      const comments = await this.taskModel.getComments(taskId);
      
      // Obtener historial
      const history = await this.taskModel.getHistory(taskId);
      
      res.json({ 
        success: true, 
        task: {
          ...task,
          comments,
          history
        }
      });
    } catch (error) {
      console.error('Error in getTaskDetails:', error);
      res.status(500).json({ error: 'Error al obtener los detalles de la tarea' });
    }
  }

  // Actualizar tarea (título, descripción, etc.)
  async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const { titulo, descripcion, fecha_limite, prioridad, estimacion_horas, etiquetas } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      if (!titulo || titulo.trim() === '') {
        return res.status(400).json({ error: 'El título es requerido' });
      }

      // Preparar datos para actualizar
      const updateData = {
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : '',
        fecha_limite: fecha_limite || null,
        prioridad: prioridad || 'media',
        estimacion_horas: estimacion_horas ? parseFloat(estimacion_horas) : null,
        etiquetas: etiquetas || null,
        updated_at: new Date()
      };

      // Actualizar en base de datos
      const success = await this.taskModel.update(taskId, updateData);
      
      if (success) {
        // Registrar en historial
        await this.taskModel.addToHistory(taskId, user.id, 'tarea_actualizada', {
          descripcion: 'Información de la tarea actualizada'
        });
        
        res.json({ success: true, message: 'Tarea actualizada correctamente' });
      } else {
        res.status(400).json({ error: 'No se pudo actualizar la tarea' });
      }
    } catch (error) {
      console.error('Error in updateTask:', error);
      res.status(500).json({ error: 'Error al actualizar la tarea' });
    }
  }

  // Eliminar tarea
  async deleteTask(req, res) {
    try {
      const { taskId } = req.params;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ error: 'No autorizado' });
      }

      // Verificar permisos (solo admin o director de proyecto)
      if (user.rol_nombre !== 'Administrador General' && user.rol_nombre !== 'Director de Proyecto') {
        return res.status(403).json({ error: 'No tienes permisos para eliminar tareas' });
      }

      const success = await this.taskModel.delete(taskId);
      
      if (success) {
        res.json({ success: true, message: 'Tarea eliminada correctamente' });
      } else {
        res.status(400).json({ error: 'No se pudo eliminar la tarea' });
      }
    } catch (error) {
      console.error('Error in deleteTask:', error);
      res.status(500).json({ error: 'Error al eliminar la tarea' });
    }
  }

  // =============================================
  // MÉTODOS PARA GESTIÓN DE LÍNEAS DE INVESTIGACIÓN
  // =============================================

  async researchLines(req, res) {
    try {
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect('/dashboard/admin');
      }

      // Obtener líneas de investigación del área del usuario
      const lineasInvestigacion = await this.lineasInvestigacionModel.query(`
        SELECT li.*, u.nombres as coordinador_nombre, u.apellidos as coordinador_apellidos,
               CONCAT(u.nombres, ' ', u.apellidos) as coordinador_nombre
        FROM lineas_investigacion li
        LEFT JOIN usuarios u ON li.coordinador_id = u.id
        WHERE li.area_trabajo_id = ?
        ORDER BY li.created_at DESC
      `, [user.area_trabajo_id]);

      // Obtener coordinadores disponibles del área
      const coordinadores = await this.userModel.query(`
        SELECT u.id, u.nombres, u.apellidos
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE u.area_trabajo_id = ? 
        AND r.nombre IN ('Coordinador Académico', 'Director de Proyecto')
        AND u.activo = 1
        ORDER BY u.nombres, u.apellidos
      `, [user.area_trabajo_id]);

      // Obtener información del área de trabajo
      const areaInfo = await this.userModel.query(`
        SELECT nombre FROM areas_trabajo WHERE id = ?
      `, [user.area_trabajo_id]);

      res.render('admin/research-lines', {
        title: 'Gestión de Líneas de Investigación',
        user,
        lineasInvestigacion: lineasInvestigacion || [],
        coordinadores: coordinadores || [],
        areaTrabajoNombre: areaInfo[0]?.nombre || 'Área de Trabajo',
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in researchLines:', error);
      req.flash('error', 'Error al cargar las líneas de investigación');
      res.redirect('/dashboard/admin');
    }
  }

  async createResearchLine(req, res) {
    try {
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { nombre, descripcion, coordinador_id, activo } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: 'El nombre es requerido.' });
      }

      // Verificar que no existe otra línea con el mismo nombre en el área
      const existingLine = await this.lineasInvestigacionModel.query(`
        SELECT id FROM lineas_investigacion 
        WHERE nombre = ? AND area_trabajo_id = ?
      `, [nombre.trim(), user.area_trabajo_id]);

      if (existingLine.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe una línea de investigación con ese nombre en tu área.' });
      }

      const lineaData = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        coordinador_id: coordinador_id || null,
        area_trabajo_id: user.area_trabajo_id,
        activo: activo === true || activo === 'true' ? 1 : 0
      };

      const result = await this.lineasInvestigacionModel.create(lineaData);

      res.json({ success: true, message: 'Línea de investigación creada exitosamente.', id: result.insertId });
    } catch (error) {
      console.error('Error in createResearchLine:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async updateResearchLine(req, res) {
    try {
      const user = req.session.user;
      const { lineId } = req.params;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { nombre, descripcion, coordinador_id, activo } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: 'El nombre es requerido.' });
      }

      // Verificar que la línea existe y pertenece al área del usuario
      const existingLine = await this.lineasInvestigacionModel.query(`
        SELECT id FROM lineas_investigacion 
        WHERE id = ? AND area_trabajo_id = ?
      `, [lineId, user.area_trabajo_id]);

      if (existingLine.length === 0) {
        return res.status(404).json({ success: false, message: 'Línea de investigación no encontrada.' });
      }

      // Verificar que no existe otra línea con el mismo nombre (excluyendo la actual)
      const duplicateLine = await this.lineasInvestigacionModel.query(`
        SELECT id FROM lineas_investigacion 
        WHERE nombre = ? AND area_trabajo_id = ? AND id != ?
      `, [nombre.trim(), user.area_trabajo_id, lineId]);

      if (duplicateLine.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe otra línea de investigación con ese nombre en tu área.' });
      }

      const lineaData = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        coordinador_id: coordinador_id || null,
        activo: activo === true || activo === 'true' ? 1 : 0
      };

      await this.lineasInvestigacionModel.update(lineId, lineaData);

      res.json({ success: true, message: 'Línea de investigación actualizada exitosamente.' });
    } catch (error) {
      console.error('Error in updateResearchLine:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async deleteResearchLine(req, res) {
    try {
      const user = req.session.user;
      const { lineId } = req.params;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      // Verificar que la línea existe y pertenece al área del usuario
      const existingLine = await this.lineasInvestigacionModel.query(`
        SELECT id FROM lineas_investigacion 
        WHERE id = ? AND area_trabajo_id = ?
      `, [lineId, user.area_trabajo_id]);

      if (existingLine.length === 0) {
        return res.status(404).json({ success: false, message: 'Línea de investigación no encontrada.' });
      }

      // Verificar si hay proyectos asociados a esta línea
      const projectsUsingLine = await this.projectModel.query(`
        SELECT COUNT(*) as count FROM proyectos 
        WHERE linea_investigacion_id = ?
      `, [lineId]);

      if (projectsUsingLine[0].count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar la línea porque tiene proyectos asociados. Desactívala en su lugar.' 
        });
      }

      await this.lineasInvestigacionModel.delete(lineId);

      res.json({ success: true, message: 'Línea de investigación eliminada exitosamente.' });
    } catch (error) {
      console.error('Error in deleteResearchLine:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  // =============================================
  // MÉTODOS PARA GESTIÓN DE CICLOS ACADÉMICOS
  // =============================================

  async academicCycles(req, res) {
    try {
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect('/dashboard/admin');
      }

      // Obtener ciclos académicos del área del usuario
      const ciclosAcademicos = await this.ciclosAcademicosModel.query(`
        SELECT * FROM ciclos_academicos 
        WHERE area_trabajo_id = ?
        ORDER BY fecha_inicio DESC
      `, [user.area_trabajo_id]);

      // Obtener información del área de trabajo
      const areaInfo = await this.userModel.query(`
        SELECT nombre FROM areas_trabajo WHERE id = ?
      `, [user.area_trabajo_id]);

      res.render('admin/academic-cycles', {
        title: 'Gestión de Ciclos Académicos',
        user,
        ciclosAcademicos: ciclosAcademicos || [],
        areaTrabajoNombre: areaInfo[0]?.nombre || 'Área de Trabajo',
        success: req.flash('success'),
        error: req.flash('error')
      });
    } catch (error) {
      console.error('Error in academicCycles:', error);
      req.flash('error', 'Error al cargar los ciclos académicos');
      res.redirect('/dashboard/admin');
    }
  }

  async createAcademicCycle(req, res) {
    try {
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { nombre, descripcion, fecha_inicio, fecha_fin, activo } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: 'El nombre es requerido.' });
      }

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ success: false, message: 'Las fechas de inicio y fin son requeridas.' });
      }

      const fechaInicioDate = new Date(fecha_inicio);
      const fechaFinDate = new Date(fecha_fin);

      if (fechaFinDate <= fechaInicioDate) {
        return res.status(400).json({ success: false, message: 'La fecha de fin debe ser posterior a la fecha de inicio.' });
      }

      // Verificar que no existe otro ciclo con el mismo nombre en el área
      const existingCycle = await this.ciclosAcademicosModel.query(`
        SELECT id FROM ciclos_academicos 
        WHERE nombre = ? AND area_trabajo_id = ?
      `, [nombre.trim(), user.area_trabajo_id]);

      if (existingCycle.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe un ciclo académico con ese nombre en tu área.' });
      }

      const cicloData = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        fecha_inicio: fecha_inicio,
        fecha_fin: fecha_fin,
        area_trabajo_id: user.area_trabajo_id,
        activo: activo === true || activo === 'true' ? 1 : 0
      };

      const result = await this.ciclosAcademicosModel.create(cicloData);

      res.json({ success: true, message: 'Ciclo académico creado exitosamente.', id: result.insertId });
    } catch (error) {
      console.error('Error in createAcademicCycle:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async updateAcademicCycle(req, res) {
    try {
      const user = req.session.user;
      const { cycleId } = req.params;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      const { nombre, descripcion, fecha_inicio, fecha_fin, activo } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({ success: false, message: 'El nombre es requerido.' });
      }

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ success: false, message: 'Las fechas de inicio y fin son requeridas.' });
      }

      const fechaInicioDate = new Date(fecha_inicio);
      const fechaFinDate = new Date(fecha_fin);

      if (fechaFinDate <= fechaInicioDate) {
        return res.status(400).json({ success: false, message: 'La fecha de fin debe ser posterior a la fecha de inicio.' });
      }

      // Verificar que el ciclo existe y pertenece al área del usuario
      const existingCycle = await this.ciclosAcademicosModel.query(`
        SELECT id FROM ciclos_academicos 
        WHERE id = ? AND area_trabajo_id = ?
      `, [cycleId, user.area_trabajo_id]);

      if (existingCycle.length === 0) {
        return res.status(404).json({ success: false, message: 'Ciclo académico no encontrado.' });
      }

      // Verificar que no existe otro ciclo con el mismo nombre (excluyendo el actual)
      const duplicateCycle = await this.ciclosAcademicosModel.query(`
        SELECT id FROM ciclos_academicos 
        WHERE nombre = ? AND area_trabajo_id = ? AND id != ?
      `, [nombre.trim(), user.area_trabajo_id, cycleId]);

      if (duplicateCycle.length > 0) {
        return res.status(400).json({ success: false, message: 'Ya existe otro ciclo académico con ese nombre en tu área.' });
      }

      const cicloData = {
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
        fecha_inicio: fecha_inicio,
        fecha_fin: fecha_fin,
        activo: activo === true || activo === 'true' ? 1 : 0
      };

      await this.ciclosAcademicosModel.update(cycleId, cicloData);

      res.json({ success: true, message: 'Ciclo académico actualizado exitosamente.' });
    } catch (error) {
      console.error('Error in updateAcademicCycle:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  async deleteAcademicCycle(req, res) {
    try {
      const user = req.session.user;
      const { cycleId } = req.params;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ success: false, message: 'No tienes permisos para realizar esta acción.' });
      }

      // Verificar que el ciclo existe y pertenece al área del usuario
      const existingCycle = await this.ciclosAcademicosModel.query(`
        SELECT id FROM ciclos_academicos 
        WHERE id = ? AND area_trabajo_id = ?
      `, [cycleId, user.area_trabajo_id]);

      if (existingCycle.length === 0) {
        return res.status(404).json({ success: false, message: 'Ciclo académico no encontrado.' });
      }

      // Verificar si hay proyectos asociados a este ciclo
      const projectsUsingCycle = await this.projectModel.query(`
        SELECT COUNT(*) as count FROM proyectos 
        WHERE ciclo_academico_id = ?
      `, [cycleId]);

      if (projectsUsingCycle[0].count > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se puede eliminar el ciclo porque tiene proyectos asociados. Desactívalo en su lugar.' 
        });
      }

      await this.ciclosAcademicosModel.delete(cycleId);

      res.json({ success: true, message: 'Ciclo académico eliminado exitosamente.' });
    } catch (error) {
      console.error('Error in deleteAcademicCycle:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor.' });
    }
  }

  // =============================================
  // API ENDPOINTS PARA CREACIÓN RÁPIDA
  // =============================================

  // API para crear línea de investigación desde formulario de proyecto
  async createResearchLineAPI(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para crear líneas de investigación.' 
        });
      }

      const { nombre, descripcion } = req.body;

      // Validaciones
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre de la línea de investigación es obligatorio.' 
        });
      }

      // Obtener el área de trabajo del usuario
      const areaTrabajoId = req.areaTrabajoId || 1; // Fallback por si no está disponible

      // Verificar si ya existe una línea con el mismo nombre en esta área
      const existingLine = await this.lineasInvestigacionModel.query(`
        SELECT id FROM lineas_investigacion 
        WHERE nombre = ? AND area_trabajo_id = ?
      `, [nombre.trim(), areaTrabajoId]);

      if (existingLine.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe una línea de investigación con ese nombre en esta área.' 
        });
      }

      // Crear la línea de investigación
      const lineaData = {
        nombre: nombre.trim(),
        descripcion: descripcion ? descripcion.trim() : null,
        area_trabajo_id: areaTrabajoId,
        activo: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      const lineaId = await this.lineasInvestigacionModel.create(lineaData);

      // Obtener la línea creada
      const nuevaLinea = await this.lineasInvestigacionModel.findById(lineaId.id);

      res.json({ 
        success: true, 
        message: 'Línea de investigación creada exitosamente.',
        linea: nuevaLinea
      });

    } catch (error) {
      console.error('Error in createResearchLineAPI:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al crear la línea de investigación.' 
      });
    }
  }

  // API para crear ciclo académico desde formulario de proyecto
  async createAcademicCycleAPI(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar permisos
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ 
          success: false, 
          message: 'No tienes permisos para crear ciclos académicos.' 
        });
      }

      const { nombre, fecha_inicio, fecha_fin } = req.body;

      // Validaciones
      if (!nombre || nombre.trim().length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'El nombre del ciclo académico es obligatorio.' 
        });
      }

      if (!fecha_inicio || !fecha_fin) {
        return res.status(400).json({ 
          success: false, 
          message: 'Las fechas de inicio y fin son obligatorias.' 
        });
      }

      // Validar fechas
      const fechaInicioDate = new Date(fecha_inicio);
      const fechaFinDate = new Date(fecha_fin);
      
      if (fechaFinDate <= fechaInicioDate) {
        return res.status(400).json({ 
          success: false, 
          message: 'La fecha de fin debe ser posterior a la fecha de inicio.' 
        });
      }

      // Obtener el área de trabajo del usuario
      const areaTrabajoId = req.areaTrabajoId || 1; // Fallback por si no está disponible

      // Verificar si ya existe un ciclo con el mismo nombre en esta área
      const existingCycle = await this.ciclosAcademicosModel.query(`
        SELECT id FROM ciclos_academicos 
        WHERE nombre = ? AND area_trabajo_id = ?
      `, [nombre.trim(), areaTrabajoId]);

      if (existingCycle.length > 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Ya existe un ciclo académico con ese nombre en esta área.' 
        });
      }

      // Crear el ciclo académico (sin descripcion ya que no existe en la tabla)
      const cicloData = {
        nombre: nombre.trim(),
        fecha_inicio: fecha_inicio,
        fecha_fin: fecha_fin,
        area_trabajo_id: areaTrabajoId,
        activo: 1,
        created_at: new Date(),
        updated_at: new Date()
      };

      const cicloId = await this.ciclosAcademicosModel.create(cicloData);

      // Obtener el ciclo creado
      const nuevoCiclo = await this.ciclosAcademicosModel.findById(cicloId.id);

      const response = { 
        success: true, 
        message: 'Ciclo académico creado exitosamente.',
        ciclo: nuevoCiclo
      };

      res.json(response);

    } catch (error) {
      console.error('Error in createAcademicCycleAPI:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al crear el ciclo académico.' 
      });
    }
  }

  // =============================================
  // API PARA CREACIÓN RÁPIDA DE TAREAS DESDE KANBAN
  // =============================================

  // API para crear tarea rápida desde el tablero Kanban
  async createQuickTask(req, res) {
    try {
      const { projectId } = req.params;
      
      // Debug: Log de los datos recibidos
      console.log('=== DEBUG createQuickTask ===');
      console.log('req.body:', req.body);
      console.log('req.params:', req.params);
      console.log('========================');
      
      const { 
        titulo, 
        descripcion, 
        asignado_a, 
        fase_id, 
        fecha_limite, 
        estimacion_horas, 
        estado_workflow, 
        etiquetas 
      } = req.body;
      const user = req.session.user;
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: 'No autorizado' 
        });
      }

      // Validaciones básicas
      if (!titulo || titulo.trim() === '') {
        return res.status(400).json({ 
          success: false, 
          message: 'El título es requerido.' 
        });
      }

      // Verificar que el proyecto existe
      const projects = await this.projectModel.findWithDetails({ id: projectId });
      if (!projects || projects.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Proyecto no encontrado.' 
        });
      }

      // Validar asignado_a si se proporciona
      let assignedUserId = null;
      if (asignado_a && asignado_a.trim() !== '') {
        const assignedUser = await this.userModel.findById(parseInt(asignado_a));
        if (assignedUser) {
          assignedUserId = parseInt(asignado_a);
        } else {
          return res.status(400).json({ 
            success: false, 
            message: `El usuario con ID ${asignado_a} no existe o no está disponible.` 
          });
        }
      }

      // Validar fase_id si se proporciona
      let phaseId = 1; // Fase por defecto
      if (fase_id && fase_id.trim() !== '') {
        phaseId = parseInt(fase_id);
      }

      // Calcular prioridad automáticamente basada en la fecha límite
      let priority = 'medium'; // Prioridad por defecto
      if (fecha_limite) {
        const deadline = new Date(fecha_limite);
        const today = new Date();
        const diffTime = deadline.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 7) {
          priority = 'high';
        } else if (diffDays <= 14) {
          priority = 'medium';
        } else {
          priority = 'low';
        }
      }

      // Validar estimación de horas
      let estimationHours = null;
      if (estimacion_horas && estimacion_horas.trim() !== '') {
        const hours = parseFloat(estimacion_horas);
        if (!isNaN(hours) && hours > 0) {
          estimationHours = hours;
        }
      }

      // Manejar archivos adjuntos si existen
      let archivos_adjuntos = [];
      if (req.files && req.files.length > 0) {
        archivos_adjuntos = req.files.map(file => ({
          nombre_original: file.originalname,
          nombre_archivo: file.filename,
          ruta: file.path,
          tipo_mime: file.mimetype,
          tamaño: file.size
        }));
      }

      const taskData = {
        proyecto_id: parseInt(projectId),
        fase_id: phaseId,
        titulo: titulo.trim(),
        descripcion: descripcion ? descripcion.trim() : '',
        fecha_limite: fecha_limite || null,
        prioridad: priority,
        asignado_a: assignedUserId,
        estimacion_horas: estimationHours,
        etiquetas: etiquetas ? etiquetas.trim() : null,
        estado_workflow: estado_workflow || 'todo',
        archivos_adjuntos: archivos_adjuntos
      };

      console.log('=== Antes de crear tarea ===');
      console.log('taskData:', taskData);
      
      const taskId = await this.taskModel.createTask(taskData);
      
      console.log('=== Después de crear tarea ===');
      console.log('taskId:', taskId);
      
      if (taskId) {
        console.log('=== Tarea creada exitosamente, agregando historial ===');
        // Registrar en historial
        await this.taskModel.addToHistory(taskId, user.id, 'tarea_creada', {
          descripcion: 'Tarea creada desde Kanban'
        });

        console.log('=== Obteniendo detalles de la tarea ===');
        // Obtener la tarea creada con todos sus detalles
        const newTask = await this.taskModel.findById(taskId);
        
        console.log('=== Enviando respuesta exitosa ===');
        res.json({ 
          success: true, 
          message: 'Tarea creada exitosamente.',
          task: newTask
        });
      } else {
        console.log('=== Error: taskId es null o undefined ===');
        res.status(500).json({ 
          success: false, 
          message: 'Error al crear la tarea.' 
        });
      }
    } catch (error) {
      console.error('Error in createQuickTask:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error interno del servidor al crear la tarea.' 
      });
    }
  }
}

module.exports = AdminController;
