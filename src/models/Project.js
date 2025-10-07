const BaseModel = require('./BaseModel');
const Invitation = require('./Invitation');

class Project extends BaseModel {
  constructor() {
    super('proyectos');
  }

  // Crear proyecto
  async create(projectData) {
    try {
      projectData.created_at = new Date();
      projectData.updated_at = new Date();
      
      return await super.create(projectData);
    } catch (error) {
      throw new Error(`Error creating project: ${error.message}`);
    }
  }

  // Obtener proyectos con información relacionada
  async findWithDetails(conditions = {}) {
    try {
      let query = `
        SELECT 
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        WHERE 1=1
      `;
      
      const values = [];
      
      if (Object.keys(conditions).length > 0) {
        for (const [key, value] of Object.entries(conditions)) {
          // Ignorar condiciones con valores no válidos para evitar pasar undefined a la consulta
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            continue;
          }
          if (key === 'fecha_inicio_desde') {
            query += ` AND p.fecha_inicio >= ?`;
            values.push(value);
          } else if (key === 'fecha_fin_hasta') {
            query += ` AND p.fecha_fin <= ?`;
            values.push(value);
          } else {
            query += ` AND p.${key} = ?`;
            values.push(value);
          }
        }
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error finding projects with details: ${error.message}`);
    }
  }

  // Obtener proyectos por estudiante (incluye tanto estudiante_id como proyecto_usuarios)
  async findByStudent(studentId, additionalConditions = {}) {
    try {
      const query = `
        SELECT DISTINCT
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin,
          at.codigo as area_trabajo_codigo,
          at.codigo as area_trabajo_nombre
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
        LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE (p.estudiante_id = ? OR (pu.usuario_id = ? AND pu.estado = 'activo'))
        ORDER BY p.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [studentId, studentId]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding projects by student: ${error.message}`);
    }
  }

  // Obtener proyectos donde el estudiante es miembro (nueva implementación)
  async findStudentProjects(studentId) {
    try {
      const query = `
        SELECT 
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin,
          at.codigo as area_trabajo_codigo,
          at.codigo as area_trabajo_nombre,
          pu.fecha_asignacion as fecha_union
        FROM proyectos p
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
        WHERE pu.usuario_id = ? AND pu.estado = 'activo'
        ORDER BY p.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [studentId]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding student projects: ${error.message}`);
    }
  }

  // Obtener proyectos donde el estudiante es miembro y que estén en un área específica
  async findStudentProjectsByArea(studentId, areaId) {
    try {
      const query = `
        SELECT 
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin,
          at.codigo as area_trabajo_codigo,
          at.codigo as area_trabajo_nombre,
          pu.fecha_asignacion as fecha_union
        FROM proyectos p
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
        WHERE pu.usuario_id = ? AND pu.estado = 'activo' AND p.area_trabajo_id = ?
        ORDER BY p.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [studentId, areaId]);
      return rows;
    } catch (error) {
      throw new Error(`Error finding student projects by area: ${error.message}`);
    }
  }

  // Obtener proyectos por director (SOLUCIÓN ROBUSTA)
  // Busca en AMBAS fuentes: director_id Y proyecto_usuarios con rol coordinador
  async findByDirector(directorId, additionalConditions = {}) {
    try {
      let query = `
        SELECT DISTINCT
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        WHERE (
          p.director_id = ? 
          OR EXISTS (
            SELECT 1 FROM proyecto_usuarios pu 
            WHERE pu.proyecto_id = p.id 
              AND pu.usuario_id = ? 
              AND pu.rol = 'coordinador' 
              AND pu.estado = 'activo'
          )
        )
      `;
      
      const values = [directorId, directorId];
      
      // Aplicar condiciones adicionales
      if (Object.keys(additionalConditions).length > 0) {
        for (const [key, value] of Object.entries(additionalConditions)) {
          // Ignorar condiciones con valores no válidos
          if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) {
            continue;
          }
          if (key === 'fecha_inicio_desde') {
            query += ` AND p.fecha_inicio >= ?`;
            values.push(value);
          } else if (key === 'fecha_fin_hasta') {
            query += ` AND p.fecha_fin <= ?`;
            values.push(value);
          } else {
            query += ` AND p.${key} = ?`;
            values.push(value);
          }
        }
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error finding projects by director: ${error.message}`);
    }
  }

  // Obtener proyectos por estado
  async findByStatus(estado) {
    try {
      return await this.findWithDetails({ estado });
    } catch (error) {
      throw new Error(`Error finding projects by status: ${error.message}`);
    }
  }

  // Actualizar estado del proyecto
  async updateStatus(projectId, newStatus, observaciones = null) {
    try {
      const updateData = {
        estado: newStatus,
        updated_at: new Date()
      };
      
      if (observaciones) {
        updateData.observaciones = observaciones;
      }
      
      return await this.update(projectId, updateData);
    } catch (error) {
      throw new Error(`Error updating project status: ${error.message}`);
    }
  }

  // Obtener estadísticas de proyectos
  async getStatistics() {
    try {
      const query = `
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM proyectos 
        GROUP BY estado
      `;
      
      const [rows] = await this.db.execute(query);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project statistics: ${error.message}`);
    }
  }

  // Buscar proyectos por término
  async search(searchTerm, conditions = {}, searchType = 'general') {
    try {
      let query = `
        SELECT 
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          li.nombre as linea_investigacion,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        WHERE 1=1
      `;
      
      const values = [];
      const searchPattern = `%${searchTerm}%`;
      
      // Diferentes tipos de búsqueda
      if (searchType === 'participants') {
        query += ` AND (
          CONCAT(u.nombres, ' ', u.apellidos) LIKE ? OR
          CONCAT(d.nombres, ' ', d.apellidos) LIKE ? OR
          u.email LIKE ? OR
          d.email LIKE ?
        )`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      } else {
        // Búsqueda general
        query += ` AND (
          p.titulo LIKE ? OR 
          p.descripcion LIKE ? OR
          CONCAT(u.nombres, ' ', u.apellidos) LIKE ? OR
          CONCAT(d.nombres, ' ', d.apellidos) LIKE ?
        )`;
        values.push(searchPattern, searchPattern, searchPattern, searchPattern);
      }
      
      // Agregar condiciones adicionales
      if (Object.keys(conditions).length > 0) {
        for (const [key, value] of Object.entries(conditions)) {
          if (key === 'fecha_inicio_desde') {
            query += ` AND p.fecha_inicio >= ?`;
            values.push(value);
          } else if (key === 'fecha_fin_hasta') {
            query += ` AND p.fecha_fin <= ?`;
            values.push(value);
          } else {
            query += ` AND p.${key} = ?`;
            values.push(value);
          }
        }
      }
      
      query += ` ORDER BY p.created_at DESC`;
      
      const [rows] = await this.db.execute(query, values);
      return rows;
    } catch (error) {
      throw new Error(`Error searching projects: ${error.message}`);
    }
  }

  // =============================================
  // MÉTODOS PARA SISTEMA DE INVITACIONES
  // =============================================

  // Generar código de invitación único
  generateInvitationCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Crear invitación para proyecto
  async createInvitation(projectId, createdById, options = {}) {
    try {
      const codigo = this.generateInvitationCode();
      
      // Verificar que el código sea único
      const existingCode = await this.findInvitationByCode(codigo);
      if (existingCode) {
        // Si existe, generar uno nuevo recursivamente
        return await this.createInvitation(projectId, createdById, options);
      }

      const invitationData = {
        proyecto_id: projectId,
        codigo_invitacion: codigo,
        creado_por_id: createdById,
        max_usos: options.maxUsos || 1,
        fecha_expiracion: options.fechaExpiracion || null,
        activo: true,
        created_at: new Date(),
        updated_at: new Date()
      };

      const query = `
        INSERT INTO project_invitations 
        (proyecto_id, codigo_invitacion, creado_por_id, max_usos, fecha_expiracion, activo, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      const [result] = await this.db.execute(query, [
        invitationData.proyecto_id,
        invitationData.codigo_invitacion,
        invitationData.creado_por_id,
        invitationData.max_usos,
        invitationData.fecha_expiracion,
        invitationData.activo,
        invitationData.created_at,
        invitationData.updated_at
      ]);

      return {
        id: result.insertId,
        codigo: codigo,
        ...invitationData
      };
    } catch (error) {
      throw new Error(`Error creating invitation: ${error.message}`);
    }
  }

  // Buscar invitación por código
  async findInvitationByCode(codigo) {
    try {
      const query = `
        SELECT pi.*, p.titulo as proyecto_titulo
        FROM project_invitations pi
        LEFT JOIN proyectos p ON pi.proyecto_id = p.id
        WHERE pi.codigo_invitacion = ? AND pi.activo = true
      `;
      
      const [rows] = await this.db.execute(query, [codigo]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding invitation: ${error.message}`);
    }
  }

  // Validar código de invitación
  async validateInvitationCode(codigo) {
    try {
      const invitation = await this.findInvitationByCode(codigo);
      
      if (!invitation) {
        return { valid: false, message: 'Código de invitación no encontrado' };
      }

      // Verificar si está activo
      if (!invitation.activo) {
        return { valid: false, message: 'Código de invitación desactivado' };
      }

      // Verificar expiración
      if (invitation.fecha_expiracion && new Date() > new Date(invitation.fecha_expiracion)) {
        return { valid: false, message: 'Código de invitación expirado' };
      }

      // Verificar límite de usos
      if (invitation.usos_actuales >= invitation.max_usos) {
        return { valid: false, message: 'Código de invitación agotado' };
      }

      return { 
        valid: true, 
        invitation: invitation,
        message: 'Código válido'
      };
    } catch (error) {
      throw new Error(`Error validating invitation: ${error.message}`);
    }
  }

  // Unir estudiante a proyecto usando código
  async joinProjectWithCode(codigo, userId) {
    try {
      const invitationModel = new Invitation();
      const invitation = await invitationModel.findByCode(codigo);
      
      if (!invitation) {
        return { success: false, message: 'Código de invitación no encontrado' };
      }

      // Verificar si el usuario ya es miembro del proyecto (activo)
      const existingQuery = `
        SELECT * FROM proyecto_usuarios 
        WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'
      `;
      const [existingMembers] = await this.db.execute(existingQuery, [invitation.proyecto_id, userId]);
      
      if (existingMembers.length > 0) {
        return { success: false, message: 'Ya eres miembro de este proyecto' };
      }

      // Obtener información del proyecto para conseguir el area_trabajo_id
      const project = await this.findById(invitation.proyecto_id);
      if (!project) {
        return { success: false, message: 'Proyecto no encontrado' };
      }

      // Determinar el rol basado en el tipo de usuario
      let rol = 'estudiante'; // rol por defecto
      
      // Obtener información del usuario para determinar el rol apropiado
      const userQuery = `
        SELECT u.id, r.nombre as rol_nombre 
        FROM usuarios u 
        JOIN roles r ON u.rol_id = r.id 
        WHERE u.id = ?
      `;
      const [userResult] = await this.db.execute(userQuery, [userId]);
      
      if (userResult.length > 0) {
        const userRole = userResult[0].rol_nombre;
        
        // Mapear roles del sistema a roles del proyecto
        switch (userRole) {
          case 'Estudiante':
            rol = 'estudiante';
            break;
          case 'Director de Proyecto':
          case 'Coordinador Académico':
            rol = 'coordinador';
            break;
          case 'Evaluador':
            rol = 'evaluador';
            break;
          case 'Administrador General':
            rol = 'administrador';
            break;
          default:
            rol = 'estudiante';
        }
      }

      // Agregar usuario como miembro del proyecto con el rol determinado
      const insertQuery = `
        INSERT INTO proyecto_usuarios 
        (proyecto_id, usuario_id, rol, estado, fecha_asignacion)
        VALUES (?, ?, ?, 'activo', NOW())
      `;

      await this.db.execute(insertQuery, [
        invitation.proyecto_id,
        userId,
        rol
      ]);

      // Actualizar los campos específicos del proyecto según el rol del usuario
      let updateProjectQuery = '';
      let updateParams = [];

      switch (rol) {
        case 'coordinador':
          // Si es coordinador (Director de Proyecto), actualizar director_id
          updateProjectQuery = 'UPDATE proyectos SET director_id = ? WHERE id = ?';
          updateParams = [userId, invitation.proyecto_id];
          break;
        case 'estudiante':
          // Si es estudiante, actualizar estudiante_id
          updateProjectQuery = 'UPDATE proyectos SET estudiante_id = ? WHERE id = ?';
          updateParams = [userId, invitation.proyecto_id];
          break;
        case 'evaluador':
          // Si es evaluador, actualizar evaluador_id
          updateProjectQuery = 'UPDATE proyectos SET evaluador_id = ? WHERE id = ?';
          updateParams = [userId, invitation.proyecto_id];
          break;
      }

      // Ejecutar la actualización del proyecto si hay una consulta definida
      if (updateProjectQuery) {
        await this.db.execute(updateProjectQuery, updateParams);
        console.log(`Actualizado campo ${rol === 'coordinador' ? 'director_id' : rol === 'estudiante' ? 'estudiante_id' : 'evaluador_id'} del proyecto ${invitation.proyecto_id} con usuario ${userId}`);
      }

      // Asignar automáticamente el usuario al área de trabajo del proyecto
      if (project.area_trabajo_id) {
        const User = require('./User');
        const userModel = new User();
        
        try {
          // Verificar si el usuario ya pertenece al área de trabajo
          const belongsToArea = await userModel.belongsToArea(userId, project.area_trabajo_id);
          if (!belongsToArea) {
            await userModel.assignToArea(userId, project.area_trabajo_id, false, false);
          }
        } catch (areaError) {
          // Si hay error asignando al área, no fallar todo el proceso
          // pero registrar el error para debugging
          console.warn(`Warning: Could not assign user ${userId} to area ${project.area_trabajo_id}: ${areaError.message}`);
        }
      }

      // Incrementar contador de usos de la invitación usando el modelo Invitation
      await invitationModel.incrementUsage(invitation.id);

      console.log(`Usuario ${userId} se unió al proyecto ${invitation.proyecto_id} con rol: ${rol}`);

      return { 
        success: true, 
        message: 'Te has unido al proyecto exitosamente',
        project: {
          id: invitation.proyecto_id,
          titulo: invitation.proyecto_nombre
        }
      };
    } catch (error) {
      throw new Error(`Error joining project: ${error.message}`);
    }
  }

  // Buscar miembro de proyecto (usa tabla proyecto_usuarios)
  async findProjectMember(projectId, userId) {
    try {
      const query = `
        SELECT * FROM project_members 
        WHERE proyecto_id = ? AND usuario_id = ? AND activo = 1
      `;
      
      const [rows] = await this.db.execute(query, [projectId, userId]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding project member: ${error.message}`);
    }
  }

  // Obtener miembros de un proyecto (versión corregida)
  async getProjectMembers(projectId) {
    try {
      const query = `
        SELECT 
          pm.*,
          u.nombres,
          u.apellidos,
          u.email,
          u.codigo_usuario,
          r.nombre as rol_nombre
        FROM project_members pm
        LEFT JOIN usuarios u ON pm.usuario_id = u.id
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE pm.proyecto_id = ? AND pm.activo = 1
        ORDER BY pm.created_at ASC
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project members: ${error.message}`);
    }
  }

  // Obtener invitaciones de un proyecto (versión corregida)
  async getProjectInvitations(projectId, filters = {}) {
    try {
      let query = `
        SELECT 
          i.*,
          u.nombres as invitado_por_nombres,
          u.apellidos as invitado_por_apellidos,
          p.titulo as proyecto_titulo
        FROM invitaciones i
        LEFT JOIN usuarios u ON i.invitado_por = u.id
        LEFT JOIN proyectos p ON i.proyecto_id = p.id
        WHERE i.proyecto_id = ?
      `;
      
      const params = [projectId];
      
      if (filters.status) {
        if (filters.status === 'active') {
          query += ' AND i.estado = "pendiente" AND i.fecha_expiracion > NOW()';
        } else if (filters.status === 'inactive') {
          query += ' AND i.estado IN ("rechazada", "expirada")';
        } else if (filters.status === 'expired') {
          query += ' AND i.fecha_expiracion <= NOW()';
        }
      }
      
      if (filters.search) {
        query += ' AND (i.codigo_invitacion LIKE ? OR i.mensaje LIKE ? OR i.email LIKE ?)';
        params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`);
      }
      
      query += ' ORDER BY i.created_at DESC';
      
      const [rows] = await this.db.execute(query, params);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project invitations: ${error.message}`);
    }
  }

  // Obtener tareas de un proyecto (corregido para usar tabla entregables)
  async getProjectTasks(projectId) {
    try {
      const query = `
        SELECT 
          e.*,
          e.titulo as nombre,
          e.descripcion,
          e.fecha_limite as fecha_vencimiento,
          e.estado,
          u.nombres as asignado_nombres,
          u.apellidos as asignado_apellidos,
          fp.nombre as fase_nombre
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        WHERE e.proyecto_id = ?
        ORDER BY e.fecha_limite ASC
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project tasks: ${error.message}`);
    }
  }

  // Obtener entregables de un proyecto
  async getProjectDeliverables(projectId) {
    try {
      const query = `
        SELECT 
          e.*,
          u.nombres as creado_por_nombres,
          u.apellidos as creado_por_apellidos
        FROM entregables e
        LEFT JOIN usuarios u ON e.creado_por_id = u.id
        WHERE e.proyecto_id = ?
        ORDER BY e.fecha_entrega DESC
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project deliverables: ${error.message}`);
    }
  }

  // Desactivar invitación
  async deactivateInvitation(invitationId) {
    try {
      const query = `
        UPDATE invitaciones 
        SET estado = 'expirada', updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      
      await this.db.execute(query, [invitationId]);
      return true;
    } catch (error) {
      throw new Error(`Error deactivating invitation: ${error.message}`);
    }
  }

  // Contar todas las invitaciones
  async countAllInvitations() {
    const query = 'SELECT COUNT(*) as total FROM project_invitations';
    const result = await this.db.query(query);
    return result[0].total;
  }

  // Contar invitaciones activas
  async countActiveInvitations() {
    const query = `
      SELECT COUNT(*) as total 
      FROM project_invitations 
      WHERE activo = 1 
      AND (fecha_expiracion IS NULL OR fecha_expiracion > NOW())
    `;
    const result = await this.db.query(query);
    return result[0].total;
  }

  // Contar todos los miembros
  async countAllMembers() {
    const query = 'SELECT COUNT(*) as total FROM proyecto_usuarios WHERE estado = "activo"';
    const result = await this.db.query(query);
    return result[0].total;
  }

  // ===== FUNCIONES DE ÁREA DE TRABAJO =====

  // Obtener proyectos por área de trabajo
  async findByArea(areaId) {
    try {
      return await this.findWithDetails({ area_trabajo_id: areaId });
    } catch (error) {
      throw new Error(`Error finding projects by area: ${error.message}`);
    }
  }

  // Asignar proyecto a área de trabajo
  async assignToArea(projectId, areaId) {
    try {
      const updateData = {
        area_trabajo_id: areaId,
        updated_at: new Date()
      };
      
      return await this.update(projectId, updateData);
    } catch (error) {
      throw new Error(`Error assigning project to area: ${error.message}`);
    }
  }

  // Verificar si un proyecto pertenece a un área específica
  async belongsToArea(projectId, areaId) {
    try {
      const query = `
        SELECT COUNT(*) as count 
        FROM proyectos 
        WHERE id = ? AND area_trabajo_id = ?
      `;
      
      const [rows] = await this.db.execute(query, [projectId, areaId]);
      return rows[0].count > 0;
    } catch (error) {
      throw new Error(`Error checking project area membership: ${error.message}`);
    }
  }

  // Obtener estadísticas de proyectos por área
  async getStatisticsByArea(areaId) {
    try {
      const query = `
        SELECT 
          estado,
          COUNT(*) as cantidad
        FROM proyectos 
        WHERE area_trabajo_id = ?
        GROUP BY estado
      `;
      
      const [rows] = await this.db.execute(query, [areaId]);
      return rows;
    } catch (error) {
      throw new Error(`Error getting project statistics by area: ${error.message}`);
    }
  }

  // Buscar proyectos dentro de un área específica
  async searchInArea(searchTerm, areaId) {
    try {
      const query = `
        SELECT 
          p.*,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        WHERE 
          p.area_trabajo_id = ? AND (
            p.titulo LIKE ? OR 
            p.descripcion LIKE ? OR
            CONCAT(u.nombres, ' ', u.apellidos) LIKE ?
          )
        ORDER BY p.created_at DESC
      `;
      
      const searchPattern = `%${searchTerm}%`;
      const [rows] = await this.db.execute(query, [areaId, searchPattern, searchPattern, searchPattern]);
      return rows;
    } catch (error) {
      throw new Error(`Error searching projects in area: ${error.message}`);
    }
  }

  // Contar proyectos por área
  async countByArea(areaId) {
    try {
      const query = `
        SELECT COUNT(*) as total 
        FROM proyectos 
        WHERE area_trabajo_id = ?
      `;
      
      const [rows] = await this.db.execute(query, [areaId]);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting projects by area: ${error.message}`);
    }
  }

  // Obtener proyectos sin área asignada
  async findWithoutArea() {
    try {
      return await this.findWithDetails({ area_trabajo_id: null });
    } catch (error) {
      throw new Error(`Error finding projects without area: ${error.message}`);
    }
  }

  // ==================== GESTIÓN DE COMENTARIOS ====================

  // Agregar comentario a un proyecto
  async addComment(projectId, userId, comentario, tipo = 'comentario', archivo_adjunto = null) {
    try {
      const query = `
        INSERT INTO proyecto_comentarios 
        (proyecto_id, usuario_id, comentario, tipo, archivo_adjunto, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `;
      
      const [result] = await this.db.execute(query, [
        projectId, 
        userId, 
        comentario, 
        tipo, 
        archivo_adjunto
      ]);
      
      return result.insertId;
    } catch (error) {
      throw new Error(`Error adding project comment: ${error.message}`);
    }
  }

  // Obtener comentarios de un proyecto
  async getComments(projectId) {
    try {
      const query = `
        SELECT 
          pc.*,
          u.nombres,
          u.apellidos,
          u.email,
          r.nombre as rol_nombre
        FROM proyecto_comentarios pc
        LEFT JOIN usuarios u ON pc.usuario_id = u.id
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE pc.proyecto_id = ?
        ORDER BY pc.created_at DESC
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      
      // Procesar archivos adjuntos
      return rows.map(comment => ({
        ...comment,
        archivo_adjunto: comment.archivo_adjunto ? JSON.parse(comment.archivo_adjunto) : null
      }));
    } catch (error) {
      throw new Error(`Error getting project comments: ${error.message}`);
    }
  }

  // Actualizar comentario de proyecto
  async updateComment(commentId, comentario, userId) {
    try {
      const query = `
        UPDATE proyecto_comentarios 
        SET comentario = ?, updated_at = NOW()
        WHERE id = ? AND usuario_id = ?
      `;
      
      const [result] = await this.db.execute(query, [comentario, commentId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error updating project comment: ${error.message}`);
    }
  }

  // Eliminar comentario de proyecto
  async deleteComment(commentId, userId) {
    try {
      const query = `
        DELETE FROM proyecto_comentarios 
        WHERE id = ? AND usuario_id = ?
      `;
      
      const [result] = await this.db.execute(query, [commentId, userId]);
      return result.affectedRows > 0;
    } catch (error) {
      throw new Error(`Error deleting project comment: ${error.message}`);
    }
  }

  // Contar comentarios de un proyecto
  async countComments(projectId) {
    try {
      const query = `
        SELECT COUNT(*) as total 
        FROM proyecto_comentarios 
        WHERE proyecto_id = ?
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      return rows[0].total;
    } catch (error) {
      throw new Error(`Error counting project comments: ${error.message}`);
    }
  }

  // Buscar proyecto por ID con detalles completos
  async findByIdWithDetails(projectId) {
    try {
      const query = `
        SELECT 
          p.*,
          CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          u.email as estudiante_email,
          u.id as estudiante_id,
          CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
          d.nombres as director_nombres,
          d.apellidos as director_apellidos,
          d.email as director_email,
          d.id as director_id,
          CONCAT(e.nombres, ' ', e.apellidos) as evaluador_nombre,
          e.nombres as evaluador_nombres,
          e.apellidos as evaluador_apellidos,
          e.email as evaluador_email,
          e.id as evaluador_id,
          li.nombre as linea_investigacion_nombre,
          ca.nombre as ciclo_nombre,
          ca.fecha_inicio as ciclo_fecha_inicio,
          ca.fecha_fin as ciclo_fecha_fin
        FROM proyectos p
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN usuarios d ON p.director_id = d.id
        LEFT JOIN usuarios e ON p.evaluador_id = e.id
        LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
        LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
        WHERE p.id = ?
      `;
      
      const [rows] = await this.db.execute(query, [projectId]);
      return rows[0] || null;
    } catch (error) {
      throw new Error(`Error finding project by ID with details: ${error.message}`);
    }
  }
}

module.exports = Project;