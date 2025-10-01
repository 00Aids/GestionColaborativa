const { pool } = require('./src/config/database');

async function verifyCoordinatorConsistency() {
  try {
    console.log('🔍 VERIFICACIÓN COMPLETA DE CONSISTENCIA DE COORDINADORES');
    console.log('='.repeat(60));
    
    // 1. Verificar coordinadores en el sistema
    console.log('\n👥 1. COORDINADORES EN EL SISTEMA:');
    const [coordinators] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, u.rol_id, u.area_trabajo_id, u.activo,
             r.nombre as rol_nombre,
             at.nombre as area_nombre, at.codigo as area_codigo
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      WHERE r.nombre = 'Coordinador Académico'
      ORDER BY u.nombres, u.apellidos
    `);
    
    console.log(`   Total de coordinadores: ${coordinators.length}`);
    coordinators.forEach(coord => {
      console.log(`   - ${coord.nombres} ${coord.apellidos} (${coord.email})`);
      console.log(`     ID: ${coord.id}, Activo: ${coord.activo ? 'Sí' : 'No'}`);
      console.log(`     Área: ${coord.area_nombre || 'Sin área'} (ID: ${coord.area_trabajo_id || 'null'})`);
    });
    
    // 2. Verificar asignaciones directas en proyecto_usuarios
    console.log('\n🔗 2. ASIGNACIONES DIRECTAS EN PROYECTO_USUARIOS:');
    const [assignments] = await pool.execute(`
      SELECT pu.usuario_id, pu.proyecto_id, pu.rol, pu.fecha_asignacion, pu.estado,
             u.nombres, u.apellidos, u.email,
             p.titulo as proyecto_titulo, p.estado as proyecto_estado
      FROM proyecto_usuarios pu
      JOIN usuarios u ON pu.usuario_id = u.id
      JOIN proyectos p ON pu.proyecto_id = p.id
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Coordinador Académico' AND pu.rol = 'coordinador'
      ORDER BY u.nombres, u.apellidos, p.titulo
    `);
    
    console.log(`   Total de asignaciones directas: ${assignments.length}`);
    assignments.forEach(assign => {
      console.log(`   - ${assign.nombres} ${assign.apellidos} → ${assign.proyecto_titulo}`);
      console.log(`     Estado asignación: ${assign.estado}, Proyecto: ${assign.proyecto_estado}`);
    });
    
    // 3. Detectar inconsistencias
    console.log('\n⚠️  3. DETECTANDO INCONSISTENCIAS:');
    
    // 3.1 Coordinadores sin área pero con proyectos asignados
    const coordsWithoutArea = coordinators.filter(c => !c.area_trabajo_id);
    const coordsWithAssignments = assignments.map(a => a.usuario_id);
    
    console.log('\n   3.1 Coordinadores sin área de trabajo:');
    coordsWithoutArea.forEach(coord => {
      const hasAssignments = coordsWithAssignments.includes(coord.id);
      console.log(`   - ${coord.nombres} ${coord.apellidos} (${coord.email})`);
      console.log(`     Tiene proyectos asignados: ${hasAssignments ? 'SÍ' : 'NO'}`);
      if (!hasAssignments) {
        console.log(`     ⚠️  PROBLEMA: Sin área Y sin proyectos asignados`);
      }
    });
    
    // 3.2 Coordinadores con área pero sin proyectos asignados
    console.log('\n   3.2 Coordinadores con área pero sin asignaciones directas:');
    const coordsWithArea = coordinators.filter(c => c.area_trabajo_id);
    coordsWithArea.forEach(coord => {
      const hasAssignments = coordsWithAssignments.includes(coord.id);
      if (!hasAssignments) {
        console.log(`   - ${coord.nombres} ${coord.apellidos} (${coord.email})`);
        console.log(`     Área: ${coord.area_nombre} (ID: ${coord.area_trabajo_id})`);
        console.log(`     ⚠️  PROBLEMA: Dependerá del fallback por área`);
      }
    });
    
    // 4. Verificar proyectos por área vs asignaciones directas
    console.log('\n📊 4. COMPARACIÓN: PROYECTOS POR ÁREA VS ASIGNACIONES DIRECTAS:');
    
    for (const coord of coordinators) {
      console.log(`\n   Coordinador: ${coord.nombres} ${coord.apellidos}`);
      
      // Proyectos por asignación directa
      const directProjects = assignments.filter(a => a.usuario_id === coord.id);
      console.log(`   Proyectos asignados directamente: ${directProjects.length}`);
      
      // Proyectos por área (si tiene área)
      if (coord.area_trabajo_id) {
        const [areaProjects] = await pool.execute(`
          SELECT COUNT(*) as count FROM proyectos WHERE area_trabajo_id = ?
        `, [coord.area_trabajo_id]);
        console.log(`   Proyectos en su área de trabajo: ${areaProjects[0].count}`);
        
        if (directProjects.length === 0 && areaProjects[0].count > 0) {
          console.log(`   ⚠️  FALLBACK: Usará ${areaProjects[0].count} proyectos del área`);
        }
      } else {
        console.log(`   Proyectos en área: N/A (sin área asignada)`);
        if (directProjects.length === 0) {
          console.log(`   🚨 CRÍTICO: Sin proyectos directos Y sin área = Dashboard vacío`);
        }
      }
    }
    
    // 5. Verificar métodos que aún usan filtrado por área
    console.log('\n🔧 5. MÉTODOS QUE REQUIEREN ACTUALIZACIÓN:');
    console.log('   Los siguientes métodos aún usan filtrado por área_trabajo_id:');
    console.log('   - coordinatorEvaluations (DashboardController.js:1589)');
    console.log('   - coordinatorStudents (DashboardController.js)');
    console.log('   - Algunos métodos en AdminController.js');
    
    // 6. Recomendaciones
    console.log('\n💡 6. RECOMENDACIONES:');
    console.log('='.repeat(40));
    console.log('   ✅ Actualizar TODOS los métodos para usar asignación directa');
    console.log('   ✅ Crear validación al asignar coordinadores a proyectos');
    console.log('   ✅ Implementar script de migración para datos existentes');
    console.log('   ✅ Agregar validación en formularios de creación');
    console.log('   ✅ Documentar el nuevo flujo de asignaciones');
    
  } catch (error) {
    console.error('❌ Error en verificación:', error);
  } finally {
    await pool.end();
  }
}

verifyCoordinatorConsistency();