const { pool } = require('./src/config/database');

async function assignStudentToProject() {
  try {
    console.log('🔧 Asignando estudiante al proyecto del coordinador coordifinal1@test.com...\n');

    // 1. Obtener información del coordinador y su proyecto
    const [coordinator] = await pool.execute(`
      SELECT 
        u.id as coordinador_id,
        u.nombres as coordinador_nombres,
        u.apellidos as coordinador_apellidos,
        p.id as proyecto_id,
        p.titulo as proyecto_titulo
      FROM usuarios u
      INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.email = 'coordifinal1@test.com' AND pu.rol = 'coordinador'
    `);

    if (coordinator.length === 0) {
      console.log('❌ No se encontró coordinador con proyectos asignados');
      await pool.end();
      return;
    }

    const coordData = coordinator[0];
    console.log('✅ Coordinador encontrado:');
    console.log(`   Nombre: ${coordData.coordinador_nombres} ${coordData.coordinador_apellidos}`);
    console.log(`   Proyecto: ${coordData.proyecto_titulo} (ID: ${coordData.proyecto_id})`);

    // 2. Buscar un estudiante disponible
    const [availableStudents] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email
      FROM usuarios u
      WHERE u.rol_id = 1 
      AND u.id NOT IN (
        SELECT DISTINCT p.estudiante_id 
        FROM proyectos p 
        WHERE p.estudiante_id IS NOT NULL
      )
      LIMIT 1
    `);

    if (availableStudents.length === 0) {
      console.log('❌ No hay estudiantes disponibles sin proyectos');
      
      // Mostrar estudiantes existentes
      const [allStudents] = await pool.execute(`
        SELECT u.id, u.nombres, u.apellidos, u.email
        FROM usuarios u
        WHERE u.rol_id = 1
        LIMIT 5
      `);
      
      console.log('\n📋 Estudiantes disponibles en el sistema:');
      allStudents.forEach(student => {
        console.log(`   - ID: ${student.id} | ${student.nombres} ${student.apellidos} | ${student.email}`);
      });
      
      if (allStudents.length > 0) {
        const studentToAssign = allStudents[0];
        console.log(`\n🔧 Asignando estudiante: ${studentToAssign.nombres} ${studentToAssign.apellidos}`);
        
        // Asignar el estudiante al proyecto
        await pool.execute(`
          UPDATE proyectos 
          SET estudiante_id = ? 
          WHERE id = ?
        `, [studentToAssign.id, coordData.proyecto_id]);
        
        console.log('✅ Estudiante asignado exitosamente');
        
        // Verificar la asignación
        const [verification] = await pool.execute(`
          SELECT 
            u.nombres as estudiante_nombres,
            u.apellidos as estudiante_apellidos,
            p.titulo as proyecto_titulo
          FROM proyectos p
          INNER JOIN usuarios u ON p.estudiante_id = u.id
          WHERE p.id = ?
        `, [coordData.proyecto_id]);
        
        if (verification.length > 0) {
          const v = verification[0];
          console.log(`✅ Verificación: ${v.estudiante_nombres} ${v.estudiante_apellidos} asignado a "${v.proyecto_titulo}"`);
        }
      }
    } else {
      const studentToAssign = availableStudents[0];
      console.log(`\n🔧 Asignando estudiante disponible: ${studentToAssign.nombres} ${studentToAssign.apellidos}`);
      
      // Asignar el estudiante al proyecto
      await pool.execute(`
        UPDATE proyectos 
        SET estudiante_id = ? 
        WHERE id = ?
      `, [studentToAssign.id, coordData.proyecto_id]);
      
      console.log('✅ Estudiante asignado exitosamente');
    }

    // 3. Probar la consulta coordinatorStudents después de la asignación
    console.log('\n📋 Probando consulta coordinatorStudents después de la asignación...');
    const [students] = await pool.execute(`
      SELECT DISTINCT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        p.titulo as proyecto_titulo,
        p.estado as proyecto_estado
      FROM usuarios u
      INNER JOIN proyectos p ON u.id = p.estudiante_id
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
      ORDER BY u.apellidos, u.nombres
    `, [coordData.coordinador_id]);

    console.log(`✅ Estudiantes que ahora debería ver: ${students.length}`);
    students.forEach(student => {
      console.log(`   - ${student.nombres} ${student.apellidos}`);
      console.log(`     Email: ${student.email}`);
      console.log(`     Proyecto: ${student.proyecto_titulo} (${student.proyecto_estado})`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

assignStudentToProject();