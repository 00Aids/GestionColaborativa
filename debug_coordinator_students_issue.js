const { pool } = require('./src/config/database');

async function debugCoordinatorStudentsIssue() {
  console.log('🔍 Diagnosticando problema de estudiantes del coordinador...\n');

  try {
    // 1. Verificar todos los coordinadores en el sistema
    console.log('📋 Paso 1: Verificando coordinadores en el sistema...');
    const [allCoordinators] = await pool.execute(`
      SELECT 
        u.id, 
        u.nombres, 
        u.apellidos, 
        u.email,
        u.area_trabajo_id,
        u.rol_id,
        at.nombre as area_nombre,
        r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.rol_id = 3
      ORDER BY u.id
    `);

    console.log(`✅ Coordinadores encontrados: ${allCoordinators.length}`);
    allCoordinators.forEach(coord => {
      console.log(`   - ID: ${coord.id} | ${coord.nombres} ${coord.apellidos} | Rol: ${coord.rol_nombre || 'Sin rol'} | Área: ${coord.area_nombre || 'Sin área'}`);
    });
    console.log('');

    // 2. Verificar asignaciones en proyecto_usuarios
    console.log('📋 Paso 2: Verificando asignaciones en proyecto_usuarios...');
    const [assignments] = await pool.execute(`
      SELECT 
        pu.usuario_id,
        pu.proyecto_id,
        pu.rol,
        u.nombres,
        u.apellidos,
        p.titulo as proyecto_titulo
      FROM proyecto_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE pu.rol = 'coordinador'
      ORDER BY pu.usuario_id
    `);

    console.log(`✅ Asignaciones de coordinador encontradas: ${assignments.length}`);
    assignments.forEach(assign => {
      console.log(`   - Coordinador: ${assign.nombres} ${assign.apellidos} (ID: ${assign.usuario_id})`);
      console.log(`     Proyecto: ${assign.proyecto_titulo} (ID: ${assign.proyecto_id})`);
    });
    console.log('');

    // 3. Para cada coordinador con asignaciones, verificar estudiantes
    console.log('📋 Paso 3: Verificando estudiantes por coordinador...');
    
    for (const assignment of assignments) {
      console.log(`\n🔍 Coordinador: ${assignment.nombres} ${assignment.apellidos} (ID: ${assignment.usuario_id})`);
      
      // Consulta actual del método coordinatorStudents
      const [students] = await pool.execute(`
        SELECT DISTINCT 
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          u.telefono,
          u.created_at as fecha_registro,
          p.titulo as proyecto_titulo,
          p.id as proyecto_id,
          p.estado as proyecto_estado
        FROM usuarios u
        INNER JOIN proyectos p ON u.id = p.estudiante_id
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        ORDER BY u.apellidos, u.nombres
      `, [assignment.usuario_id]);

      console.log(`   📊 Estudiantes encontrados: ${students.length}`);
      
      if (students.length > 0) {
        students.forEach(student => {
          console.log(`     - ${student.nombres} ${student.apellidos} (Proyecto: ${student.proyecto_titulo})`);
        });
      } else {
        console.log(`     ⚠️  No se encontraron estudiantes para este coordinador`);
        
        // Verificar si el proyecto tiene estudiante
        const [projectInfo] = await pool.execute(`
          SELECT 
            p.id,
            p.titulo,
            p.estudiante_id,
            u.nombres as estudiante_nombres,
            u.apellidos as estudiante_apellidos
          FROM proyectos p
          LEFT JOIN usuarios u ON p.estudiante_id = u.id
          WHERE p.id = ?
        `, [assignment.proyecto_id]);

        if (projectInfo.length > 0) {
          const project = projectInfo[0];
          console.log(`     📋 Información del proyecto:`);
          console.log(`        - Título: ${project.titulo}`);
          console.log(`        - Estudiante ID: ${project.estudiante_id}`);
          console.log(`        - Estudiante: ${project.estudiante_nombres || 'N/A'} ${project.estudiante_apellidos || ''}`);
        }
      }
    }

    // 4. Verificar si hay proyectos con estudiantes pero sin coordinador asignado
    console.log('\n📋 Paso 4: Verificando proyectos con estudiantes sin coordinador...');
    const [orphanProjects] = await pool.execute(`
      SELECT 
        p.id,
        p.titulo,
        p.estado,
        u.nombres as estudiante_nombres,
        u.apellidos as estudiante_apellidos
      FROM proyectos p
      INNER JOIN usuarios u ON p.estudiante_id = u.id
      LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id AND pu.rol = 'coordinador'
      WHERE pu.proyecto_id IS NULL
      ORDER BY p.id
    `);

    console.log(`✅ Proyectos sin coordinador asignado: ${orphanProjects.length}`);
    orphanProjects.forEach(project => {
      console.log(`   - Proyecto: ${project.titulo} | Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos}`);
    });

    // 5. Resumen y recomendaciones
    console.log('\n📝 RESUMEN DEL DIAGNÓSTICO:');
    console.log(`   📊 Total coordinadores: ${allCoordinators.length}`);
    console.log(`   📊 Coordinadores con asignaciones: ${assignments.length}`);
    console.log(`   📊 Proyectos sin coordinador: ${orphanProjects.length}`);
    
    if (assignments.length === 0) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: No hay coordinadores asignados a proyectos');
      console.log('   💡 SOLUCIÓN: Asignar coordinadores a proyectos usando proyecto_usuarios');
    } else if (orphanProjects.length > 0) {
      console.log('\n⚠️  PROBLEMA IDENTIFICADO: Hay proyectos sin coordinador asignado');
      console.log('   💡 SOLUCIÓN: Asignar coordinadores a estos proyectos');
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error);
  } finally {
    await pool.end();
  }
}

debugCoordinatorStudentsIssue();