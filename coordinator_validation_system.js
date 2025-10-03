const { pool } = require('./src/config/database');

class CoordinatorValidationSystem {
  
  /**
   * Valida la consistencia de un coordinador antes de asignarlo a un proyecto
   */
  async validateCoordinatorAssignment(coordinatorId, projectId) {
    try {
      console.log(`🔍 Validando asignación: Coordinador ${coordinatorId} → Proyecto ${projectId}`);
      
      const issues = [];
      
      // 1. Verificar que el coordinador existe y está activo
      const [coordinator] = await pool.execute(`
        SELECT u.id, u.nombres, u.apellidos, u.email, u.activo, u.area_trabajo_id,
               r.nombre as rol_nombre
        FROM usuarios u
        LEFT JOIN roles r ON u.rol_id = r.id
        WHERE u.id = ?
      `, [coordinatorId]);
      
      if (!coordinator.length) {
        issues.push(`❌ Coordinador con ID ${coordinatorId} no existe`);
        return { valid: false, issues };
      }
      
      const coord = coordinator[0];
      
      if (!coord.activo) {
        issues.push(`❌ Coordinador ${coord.nombres} ${coord.apellidos} está inactivo`);
      }
      
      if (coord.rol_nombre !== 'Coordinador Académico') {
        issues.push(`❌ Usuario ${coord.nombres} ${coord.apellidos} no tiene rol de Coordinador Académico (actual: ${coord.rol_nombre})`);
      }
      
      // 2. Verificar que el proyecto existe y está activo
      const [project] = await pool.execute(`
        SELECT id, titulo, estado, area_trabajo_id
        FROM proyectos
        WHERE id = ?
      `, [projectId]);
      
      if (!project.length) {
        issues.push(`❌ Proyecto con ID ${projectId} no existe`);
        return { valid: false, issues };
      }
      
      const proj = project[0];
      
      if (proj.estado === 'completado' || proj.estado === 'cancelado') {
        issues.push(`⚠️  Proyecto "${proj.titulo}" está en estado ${proj.estado}`);
      }
      
      // 3. Verificar si ya existe una asignación
      const [existingAssignment] = await pool.execute(`
        SELECT id, rol, estado
        FROM proyecto_usuarios
        WHERE usuario_id = ? AND proyecto_id = ?
      `, [coordinatorId, projectId]);
      
      if (existingAssignment.length > 0) {
        const assignment = existingAssignment[0];
        if (assignment.rol === 'coordinador') {
          issues.push(`⚠️  Coordinador ya está asignado a este proyecto (Estado: ${assignment.estado})`);
        } else {
          issues.push(`⚠️  Usuario ya está asignado a este proyecto con rol: ${assignment.rol}`);
        }
      }
      
      // 4. Verificar si hay otro coordinador asignado
      const [otherCoordinator] = await pool.execute(`
        SELECT pu.usuario_id, u.nombres, u.apellidos
        FROM proyecto_usuarios pu
        JOIN usuarios u ON pu.usuario_id = u.id
        WHERE pu.proyecto_id = ? AND pu.rol = 'coordinador' AND pu.usuario_id != ?
      `, [projectId, coordinatorId]);
      
      if (otherCoordinator.length > 0) {
        const other = otherCoordinator[0];
        issues.push(`⚠️  Proyecto ya tiene otro coordinador: ${other.nombres} ${other.apellidos} (ID: ${other.usuario_id})`);
      }
      
      // 5. Verificar compatibilidad de áreas (si aplica)
      if (coord.area_trabajo_id && proj.area_trabajo_id && coord.area_trabajo_id !== proj.area_trabajo_id) {
        const [coordArea] = await pool.execute('SELECT nombre FROM areas_trabajo WHERE id = ?', [coord.area_trabajo_id]);
        const [projArea] = await pool.execute('SELECT nombre FROM areas_trabajo WHERE id = ?', [proj.area_trabajo_id]);
        
        issues.push(`⚠️  Área del coordinador (${coordArea[0]?.nombre}) difiere del área del proyecto (${projArea[0]?.nombre})`);
      }
      
      const valid = !issues.some(issue => issue.startsWith('❌'));
      
      return {
        valid,
        issues,
        coordinator: coord,
        project: proj
      };
      
    } catch (error) {
      console.error('Error en validación:', error);
      return {
        valid: false,
        issues: [`❌ Error interno: ${error.message}`]
      };
    }
  }
  
  /**
   * Asigna un coordinador a un proyecto con validación completa
   */
  async assignCoordinatorToProject(coordinatorId, projectId, force = false) {
    try {
      console.log(`🔄 Asignando coordinador ${coordinatorId} al proyecto ${projectId}...`);
      
      // Validar la asignación
      const validation = await this.validateCoordinatorAssignment(coordinatorId, projectId);
      
      if (!validation.valid && !force) {
        console.log('❌ Validación fallida:');
        validation.issues.forEach(issue => console.log(`   ${issue}`));
        return { success: false, issues: validation.issues };
      }
      
      if (validation.issues.length > 0) {
        console.log('⚠️  Advertencias encontradas:');
        validation.issues.forEach(issue => console.log(`   ${issue}`));
        
        if (!force) {
          console.log('💡 Use force=true para proceder a pesar de las advertencias');
          return { success: false, issues: validation.issues };
        }
      }
      
      // ===== SINCRONIZACIÓN DE ÁREA =====
      const projectAreaId = validation.project.area_trabajo_id;
      if (projectAreaId) {
        // Asegurar que el coordinador pertenezca al área del proyecto
        const [belongsRows] = await pool.execute(
          'SELECT 1 FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
          [coordinatorId, projectAreaId]
        );
        if (belongsRows.length === 0) {
          await pool.execute(
            'INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at) VALUES (?, ?, 0, 0, 1, NOW())',
            [coordinatorId, projectAreaId]
          );
          console.log(`✅ Coordinador ${coordinatorId} agregado al área de trabajo ${projectAreaId}`);
        }
        // Si el usuario no tiene área primaria, establecerla al área del proyecto
        if (!validation.coordinator.area_trabajo_id) {
          await pool.execute(
            'UPDATE usuarios SET area_trabajo_id = ?, updated_at = NOW() WHERE id = ? AND area_trabajo_id IS NULL',
            [projectAreaId, coordinatorId]
          );
          console.log(`✅ Establecida área primaria del coordinador ${coordinatorId} a ${projectAreaId}`);
        }
      }
      
      // Realizar la asignación
      await pool.execute(`
        INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
        VALUES (?, ?, 'coordinador', NOW(), 'activo')
        ON DUPLICATE KEY UPDATE
        rol = 'coordinador',
        fecha_asignacion = NOW(),
        estado = 'activo'
      `, [projectId, coordinatorId]);
      
      console.log('✅ Coordinador asignado exitosamente');
      
      return {
        success: true,
        message: `Coordinador ${validation.coordinator.nombres} ${validation.coordinator.apellidos} asignado al proyecto "${validation.project.titulo}"`
      };
      
    } catch (error) {
      console.error('Error en asignación:', error);
      return {
        success: false,
        issues: [`❌ Error al asignar: ${error.message}`]
      };
    }
  }
  
  /**
   * Corrige inconsistencias existentes en el sistema
   */
  async fixExistingInconsistencies() {
    try {
      console.log('🔧 CORRIGIENDO INCONSISTENCIAS EXISTENTES...');
      console.log('='.repeat(50));
      
      // 1. Encontrar coordinadores problemáticos
      const [problematicCoords] = await pool.execute(`
        SELECT u.id, u.nombres, u.apellidos, u.email, u.area_trabajo_id,
               COUNT(pu.proyecto_id) as proyectos_asignados
        FROM usuarios u
        LEFT JOIN roles r ON u.rol_id = r.id
        LEFT JOIN proyecto_usuarios pu ON u.id = pu.usuario_id AND pu.rol = 'coordinador'
        WHERE r.nombre = 'Coordinador Académico' AND u.activo = 1
        GROUP BY u.id
        HAVING proyectos_asignados = 0 AND u.area_trabajo_id IS NULL
      `);
      
      console.log(`\n🚨 Coordinadores sin proyectos Y sin área: ${problematicCoords.length}`);
      
      if (problematicCoords.length > 0) {
        console.log('   Estos coordinadores tendrán dashboards vacíos:');
        problematicCoords.forEach(coord => {
          console.log(`   - ${coord.nombres} ${coord.apellidos} (${coord.email})`);
        });
        
        console.log('\n💡 RECOMENDACIÓN: Asignar estos coordinadores a proyectos o áreas');
      }
      
      // 2. Actualizar métodos que aún usan filtrado por área
      console.log('\n🔄 MÉTODOS QUE NECESITAN ACTUALIZACIÓN:');
      console.log('   - coordinatorEvaluations en DashboardController.js');
      console.log('   - coordinatorStudents en DashboardController.js');
      console.log('   - Métodos en AdminController.js que filtran por área');
      
      return {
        success: true,
        problematicCoordinators: problematicCoords
      };
      
    } catch (error) {
      console.error('Error corrigiendo inconsistencias:', error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Genera un reporte completo del estado del sistema
   */
  async generateSystemReport() {
    try {
      console.log('📊 REPORTE DEL SISTEMA DE COORDINADORES');
      console.log('='.repeat(50));
      
      // Estadísticas generales
      const [stats] = await pool.execute(`
        SELECT 
          COUNT(*) as total_coordinadores,
          COUNT(CASE WHEN u.activo = 1 THEN 1 END) as coordinadores_activos,
          COUNT(CASE WHEN u.area_trabajo_id IS NOT NULL THEN 1 END) as con_area,
          COUNT(CASE WHEN u.area_trabajo_id IS NULL THEN 1 END) as sin_area
        FROM usuarios u
        JOIN roles r ON u.rol_id = r.id
        WHERE r.nombre = 'Coordinador Académico'
      `);
      
      const [assignmentStats] = await pool.execute(`
        SELECT 
          COUNT(DISTINCT pu.usuario_id) as coordinadores_con_proyectos,
          COUNT(*) as total_asignaciones
        FROM proyecto_usuarios pu
        JOIN usuarios u ON pu.usuario_id = u.id
        JOIN roles r ON u.rol_id = r.id
        WHERE r.nombre = 'Coordinador Académico' AND pu.rol = 'coordinador'
      `);
      
      console.log('\n📈 ESTADÍSTICAS:');
      console.log(`   Total coordinadores: ${stats[0].total_coordinadores}`);
      console.log(`   Coordinadores activos: ${stats[0].coordinadores_activos}`);
      console.log(`   Con área asignada: ${stats[0].con_area}`);
      console.log(`   Sin área asignada: ${stats[0].sin_area}`);
      console.log(`   Con proyectos asignados: ${assignmentStats[0].coordinadores_con_proyectos}`);
      console.log(`   Total asignaciones: ${assignmentStats[0].total_asignaciones}`);
      
      return {
        success: true,
        stats: stats[0],
        assignmentStats: assignmentStats[0]
      };
      
    } catch (error) {
      console.error('Error generando reporte:', error);
      return { success: false, error: error.message };
    }
  }
}

// Función de prueba
async function testValidationSystem() {
  const validator = new CoordinatorValidationSystem();
  
  try {
    // Generar reporte del sistema
    await validator.generateSystemReport();
    
    // Corregir inconsistencias
    await validator.fixExistingInconsistencies();
    
    console.log('\n✅ Sistema de validación listo para usar');
    console.log('\n📝 EJEMPLOS DE USO:');
    console.log('   const validator = new CoordinatorValidationSystem();');
    console.log('   await validator.validateCoordinatorAssignment(coordinatorId, projectId);');
    console.log('   await validator.assignCoordinatorToProject(coordinatorId, projectId);');
    
  } catch (error) {
    console.error('Error en prueba:', error);
  } finally {
    await pool.end();
  }
}

// Exportar la clase y ejecutar prueba si se ejecuta directamente
module.exports = CoordinatorValidationSystem;

if (require.main === module) {
  testValidationSystem();
}