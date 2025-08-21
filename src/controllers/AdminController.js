const User = require('../models/User');
const Role = require('../models/Role');
const Project = require('../models/Project');
const Deliverable = require('../models/Deliverable');
const BaseModel = require('../models/BaseModel');

class AdminController {
  constructor() {
    this.userModel = new User();
    this.roleModel = new Role();
    this.projectModel = new Project();
    this.deliverableModel = new Deliverable();
    this.lineasInvestigacionModel = new BaseModel('lineas_investigacion');
    this.ciclosAcademicosModel = new BaseModel('ciclos_academicos');
  }

  // Mostrar página de gestión de usuarios
  async users(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect('/dashboard');
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

  // =============================================
  // GESTIÓN DE PROYECTOS
  // =============================================

  // Mostrar página de gestión de proyectos
  async projects(req, res) {
    try {
      const user = req.session.user;
      
      // Verificar que el usuario existe y es administrador
      if (!user || user.rol_nombre !== 'Administrador General') {
        req.flash('error', 'No tienes permisos para acceder a esta página.');
        return res.redirect('/dashboard');
      }

      const { search, estado, linea, page = 1 } = req.query;
      const limit = 15;
      const offset = (page - 1) * limit;
      
      let allProjects;
      
      if (search) {
        allProjects = await this.projectModel.search(search);
      } else {
        const conditions = estado ? { estado } : {};
        allProjects = await this.projectModel.findWithDetails(conditions);
      }
      
      // Obtener estadísticas de proyectos (ajustadas para coincidir con la vista)
      const stats = {
        total: allProjects.length,
        active: allProjects.filter(p => ['borrador', 'enviado', 'en_revision', 'aprobado', 'en_desarrollo'].includes(p.estado)).length,
        completed: allProjects.filter(p => p.estado === 'finalizado').length,
        pending: allProjects.filter(p => ['borrador', 'enviado'].includes(p.estado)).length
      };
      
      // Paginación
      const totalProjects = allProjects.length;
      const paginatedProjects = allProjects.slice(offset, offset + limit);
      const totalPages = Math.ceil(totalProjects / limit);
      
      // Obtener datos adicionales necesarios para la vista
      const [lineasInvestigacion, ciclosAcademicos, allUsers] = await Promise.all([
        this.lineasInvestigacionModel.findAll({ activo: true }),
        this.ciclosAcademicosModel.findAll({ activo: true }),
        this.userModel.findWithRole()
      ]);
      
      const estudiantes = allUsers.filter(u => u.rol_nombre === 'Estudiante');
      const directores = allUsers.filter(u => u.rol_nombre === 'Director de Proyecto');
      
      // Formatear proyectos para la vista
      const projects = paginatedProjects.map(project => ({
        ...project,
        estudiante_nombre: `${project.estudiante_nombres} ${project.estudiante_apellidos}`,
        estudiante_email: project.estudiante_email,
        director_nombre: project.director_nombres ? `${project.director_nombres} ${project.director_apellidos}` : 'Sin asignar',
        director_email: project.director_email || '',
        linea_investigacion: project.linea_investigacion_nombre || 'Sin asignar',
        fecha_creacion: project.created_at
      }));
      
      // Configurar paginación
      const pagination = {
        currentPage: parseInt(page),
        totalPages,
        totalItems: totalProjects
      };

      res.render('admin/projects', {
        title: 'Gestión de Proyectos',
        user,
        projects,
        stats,
        lineasInvestigacion,
        ciclosAcademicos,
        estudiantes,
        directores,
        pagination,
        search: search || '',
        statusFilter: estado || '',
        lineaFilter: linea || '',
        message: req.flash('success')[0] || null,
        error: req.flash('error')[0] || null
      });
    } catch (error) {
      console.error('Error in admin projects:', error);
      req.flash('error', 'Error al cargar la gestión de proyectos');
      res.redirect('/dashboard/admin');
    }
  }

  // Crear nuevo proyecto
  async createProject(req, res) {
    try {
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const {
        titulo,
        descripcion,
        objetivos,
        metodologia,
        estudiante_id,
        director_id,
        evaluador_id,
        linea_investigacion_id,
        ciclo_academico_id,
        estado
      } = req.body;
      
      // Validaciones
      if (!titulo || !descripcion || !estudiante_id) {
        return res.status(400).json({ error: 'Título, descripción y estudiante son obligatorios' });
      }
      
      const projectData = {
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        objetivos: objetivos ? objetivos.trim() : null,
        metodologia: metodologia ? metodologia.trim() : null,
        estudiante_id: parseInt(estudiante_id),
        director_id: director_id ? parseInt(director_id) : null,
        evaluador_id: evaluador_id ? parseInt(evaluador_id) : null,
        linea_investigacion_id: linea_investigacion_id ? parseInt(linea_investigacion_id) : null,
        ciclo_academico_id: ciclo_academico_id ? parseInt(ciclo_academico_id) : null,
        estado: estado || 'borrador'
      };
      
      const project = await this.projectModel.create(projectData);
      
      res.json({ 
        success: true, 
        message: 'Proyecto creado exitosamente',
        project 
      });
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar proyecto
  async updateProject(req, res) {
    try {
      const { projectId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const project = await this.projectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      const {
        titulo,
        descripcion,
        objetivos,
        metodologia,
        estudiante_id,
        director_id,
        evaluador_id,
        linea_investigacion_id,
        ciclo_academico_id,
        estado,
        calificacion_final,
        observaciones_generales
      } = req.body;
      
      const updateData = {
        titulo: titulo ? titulo.trim() : project.titulo,
        descripcion: descripcion ? descripcion.trim() : project.descripcion,
        objetivos: objetivos !== undefined ? (objetivos ? objetivos.trim() : null) : project.objetivos,
        metodologia: metodologia !== undefined ? (metodologia ? metodologia.trim() : null) : project.metodologia,
        estudiante_id: estudiante_id ? parseInt(estudiante_id) : project.estudiante_id,
        director_id: director_id !== undefined ? (director_id ? parseInt(director_id) : null) : project.director_id,
        evaluador_id: evaluador_id !== undefined ? (evaluador_id ? parseInt(evaluador_id) : null) : project.evaluador_id,
        linea_investigacion_id: linea_investigacion_id !== undefined ? (linea_investigacion_id ? parseInt(linea_investigacion_id) : null) : project.linea_investigacion_id,
        ciclo_academico_id: ciclo_academico_id ? parseInt(ciclo_academico_id) : project.ciclo_academico_id,
        estado: estado || project.estado,
        calificacion_final: calificacion_final !== undefined ? (calificacion_final ? parseFloat(calificacion_final) : null) : project.calificacion_final,
        observaciones_generales: observaciones_generales !== undefined ? (observaciones_generales ? observaciones_generales.trim() : null) : project.observaciones_generales
      };
      
      // Actualizar fechas según el estado
      if (estado === 'aprobado' && project.estado !== 'aprobado') {
        updateData.fecha_aprobacion = new Date();
      }
      if (estado === 'finalizado' && project.estado !== 'finalizado') {
        updateData.fecha_finalizacion = new Date();
      }
      
      await this.projectModel.update(projectId, updateData);
      
      res.json({ 
        success: true, 
        message: 'Proyecto actualizado exitosamente'
      });
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Cambiar estado del proyecto
  async changeProjectStatus(req, res) {
    try {
      const { projectId } = req.params;
      const { estado } = req.body;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const project = await this.projectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      const validStates = ['borrador', 'enviado', 'en_revision', 'aprobado', 'rechazado', 'en_desarrollo', 'finalizado'];
      if (!validStates.includes(estado)) {
        return res.status(400).json({ error: 'Estado no válido' });
      }
      
      const updateData = { estado };
      
      // Actualizar fechas según el estado
      if (estado === 'aprobado' && project.estado !== 'aprobado') {
        updateData.fecha_aprobacion = new Date();
      }
      if (estado === 'finalizado' && project.estado !== 'finalizado') {
        updateData.fecha_finalizacion = new Date();
      }
      
      await this.projectModel.update(projectId, updateData);
      
      res.json({ 
        success: true, 
        message: `Estado del proyecto cambiado a ${estado} exitosamente`,
        newStatus: estado
      });
    } catch (error) {
      console.error('Error changing project status:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar proyecto (soft delete)
  async deleteProject(req, res) {
    try {
      const { projectId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const project = await this.projectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      // Soft delete - marcar como inactivo
      await this.projectModel.update(projectId, { activo: false });
      
      res.json({ 
        success: true, 
        message: 'Proyecto eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener detalles del proyecto para edición
  async getProjectDetails(req, res) {
    try {
      const { projectId } = req.params;
      const user = req.session.user;
      
      if (!user || user.rol_nombre !== 'Administrador General') {
        return res.status(403).json({ error: 'No autorizado' });
      }

      const projects = await this.projectModel.findWithDetails({ id: projectId });
      const project = projects[0];
      
      if (!project) {
        return res.status(404).json({ error: 'Proyecto no encontrado' });
      }

      // Obtener entregables del proyecto
      const deliverables = await this.deliverableModel.findByProject(projectId);
      
      res.json({ 
        success: true, 
        project,
        deliverables
      });
    } catch (error) {
      console.error('Error getting project details:', error);
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
}

module.exports = AdminController;