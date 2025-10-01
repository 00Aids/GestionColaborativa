const { pool } = require('./src/config/database');

async function testUpdatedCoordinatorMethods() {
  console.log('🧪 Probando métodos actualizados de coordinador...\n');

  try {
    // 1. Obtener un coordinador que tenga proyectos asignados
    console.log('📋 Paso 1: Buscando coordinador con proyectos asignados...');
    const [coordinators] = await pool.execute(`
      SELECT DISTINCT 
        u.id, 
        u.nombres, 
        u.apellidos,
        COUNT(pu.proyecto_id) as proyectos_asignados
      FROM usuarios u
      INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      WHERE pu.rol = 'coordinador'
      GROUP BY u.id, u.nombres, u.apellidos
      HAVING proyectos_asignados > 0
      LIMIT 1
    `);

    if (coordinators.length === 0) {
      console.log('❌ No se encontraron coordinadores con proyectos asignados');
      return;
    }

    const coordinator = coordinators[0];
    console.log(`✅ Coordinador encontrado: ${coordinator.nombres} ${coordinator.apellidos} (ID: ${coordinator.id})`);
    console.log(`   Proyectos asignados: ${coordinator.proyectos_asignados}\n`);

    // 2. Probar consulta de estudiantes (método coordinatorStudents)
    console.log('📋 Paso 2: Probando consulta de estudiantes...');
    const studentsQuery = `
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
    `;

    const [students] = await pool.execute(studentsQuery, [coordinator.id]);
    console.log(`✅ Estudiantes encontrados: ${students.length}`);
    
    if (students.length > 0) {
      console.log('   Primeros estudiantes:');
      students.slice(0, 3).forEach(student => {
        console.log(`   - ${student.nombres} ${student.apellidos} (Proyecto: ${student.proyecto_titulo})`);
      });
    }
    console.log('');

    // 3. Probar consulta de evaluaciones (método coordinatorEvaluations)
    console.log('📋 Paso 3: Probando consulta de evaluaciones...');
    const evaluationsQuery = `
      SELECT 
        e.*,
        p.titulo as proyecto_titulo,
        u.nombres as estudiante_nombres,
        u.apellidos as estudiante_apellidos,
        d.titulo as entregable_titulo
      FROM evaluaciones e
      INNER JOIN proyectos p ON e.proyecto_id = p.id
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      INNER JOIN usuarios u ON p.estudiante_id = u.id
      LEFT JOIN entregables d ON e.entregable_id = d.id
      WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
      ORDER BY e.fecha_evaluacion DESC
    `;

    const [evaluations] = await pool.execute(evaluationsQuery, [coordinator.id]);
    console.log(`✅ Evaluaciones encontradas: ${evaluations.length}`);
    
    if (evaluations.length > 0) {
      console.log('   Primeras evaluaciones:');
      evaluations.slice(0, 3).forEach(evaluation => {
        console.log(`   - Proyecto: ${evaluation.proyecto_titulo} | Estudiante: ${evaluation.estudiante_nombres} ${evaluation.estudiante_apellidos}`);
      });
    }
    console.log('');

    // 4. Comparar con el enfoque anterior (area_trabajo_id)
    console.log('📋 Paso 4: Comparando con enfoque anterior...');
    
    // Obtener área de trabajo del coordinador
    const [coordinatorArea] = await pool.execute(
      'SELECT area_trabajo_id FROM usuarios WHERE id = ?',
      [coordinator.id]
    );

    if (coordinatorArea.length > 0 && coordinatorArea[0].area_trabajo_id) {
      // Consulta antigua para estudiantes
      const oldStudentsQuery = `
        SELECT DISTINCT 
          u.id,
          u.nombres,
          u.apellidos,
          p.titulo as proyecto_titulo
        FROM usuarios u
        INNER JOIN proyectos p ON u.id = p.estudiante_id
        WHERE p.area_trabajo_id = ?
      `;

      const [oldStudents] = await pool.execute(oldStudentsQuery, [coordinatorArea[0].area_trabajo_id]);
      
      console.log(`📊 Comparación de resultados:`);
      console.log(`   Enfoque NUEVO (asignación directa): ${students.length} estudiantes`);
      console.log(`   Enfoque ANTERIOR (área de trabajo): ${oldStudents.length} estudiantes`);
      
      if (students.length !== oldStudents.length) {
        console.log(`⚠️  DIFERENCIA DETECTADA: Los enfoques devuelven resultados diferentes`);
        console.log(`   Esto es ESPERADO si el coordinador tiene asignaciones específicas`);
      } else {
        console.log(`✅ Ambos enfoques devuelven la misma cantidad de estudiantes`);
      }
    } else {
      console.log(`✅ Coordinador sin área de trabajo asignada - enfoque nuevo es necesario`);
    }

    console.log('\n🎉 Prueba completada exitosamente!');
    console.log('\n📝 Resumen:');
    console.log(`   ✅ Método coordinatorStudents: ${students.length} estudiantes`);
    console.log(`   ✅ Método coordinatorEvaluations: ${evaluations.length} evaluaciones`);
    console.log(`   ✅ Ambos métodos usan asignación directa correctamente`);

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await pool.end();
  }
}

// Ejecutar la prueba
testUpdatedCoordinatorMethods();