const { pool } = require('./src/config/database');

async function fixCoordinatorAssignment() {
  console.log('🔧 Solucionando asignación de coordinador...\n');

  try {
    // 1. Obtener proyectos con estudiantes pero sin coordinador
    console.log('📋 Paso 1: Obteniendo proyectos con estudiantes sin coordinador...');
    const [orphanProjects] = await pool.execute(`
      SELECT 
        p.id,
        p.titulo,
        p.estado,
        p.estudiante_id,
        u.nombres as estudiante_nombres,
        u.apellidos as estudiante_apellidos,
        u.email as estudiante_email
      FROM proyectos p
      INNER JOIN usuarios u ON p.estudiante_id = u.id
      LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id AND pu.rol = 'coordinador'
      WHERE pu.proyecto_id IS NULL
      ORDER BY p.id
      LIMIT 3
    `);

    console.log(`✅ Proyectos encontrados: ${orphanProjects.length}`);
    orphanProjects.forEach((project, index) => {
      console.log(`   ${index + 1}. Proyecto: "${project.titulo}" (ID: ${project.id})`);
      console.log(`      Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos} (${project.estudiante_email})`);
      console.log(`      Estado: ${project.estado}`);
    });

    if (orphanProjects.length === 0) {
      console.log('⚠️  No hay proyectos con estudiantes sin coordinador');
      return;
    }

    // 2. Obtener coordinadores disponibles
    console.log('\n📋 Paso 2: Obteniendo coordinadores disponibles...');
    const [availableCoordinators] = await pool.execute(`
      SELECT 
        u.id, 
        u.nombres, 
        u.apellidos, 
        u.email,
        u.area_trabajo_id,
        at.nombre as area_nombre
      FROM usuarios u
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      WHERE u.rol_id = 3 AND u.activo = 1
      ORDER BY u.id
    `);

    console.log(`✅ Coordinadores disponibles: ${availableCoordinators.length}`);
    availableCoordinators.forEach((coord, index) => {
      console.log(`   ${index + 1}. ${coord.nombres} ${coord.apellidos} (ID: ${coord.id}) - ${coord.email}`);
    });

    // 3. Asignar el primer coordinador al primer proyecto
    if (availableCoordinators.length > 0 && orphanProjects.length > 0) {
      const coordinator = availableCoordinators[0];
      const project = orphanProjects[0];

      console.log(`\n🔧 Paso 3: Asignando coordinador al proyecto...`);
      console.log(`   Coordinador: ${coordinator.nombres} ${coordinator.apellidos} (ID: ${coordinator.id})`);
      console.log(`   Proyecto: "${project.titulo}" (ID: ${project.id})`);

      // Verificar si ya existe la asignación
      const [existingAssignment] = await pool.execute(`
        SELECT * FROM proyecto_usuarios 
        WHERE proyecto_id = ? AND usuario_id = ? AND rol = 'coordinador'
      `, [project.id, coordinator.id]);

      if (existingAssignment.length > 0) {
        console.log('⚠️  La asignación ya existe');
      } else {
        // Crear la asignación
        await pool.execute(`
          INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion)
          VALUES (?, ?, 'coordinador', NOW())
        `, [project.id, coordinator.id]);

        console.log('✅ Asignación creada exitosamente');

        // 4. Verificar la asignación
        console.log('\n📋 Paso 4: Verificando la asignación...');
        const [verification] = await pool.execute(`
          SELECT 
            pu.proyecto_id,
            pu.usuario_id,
            pu.rol,
            pu.fecha_asignacion,
            u.nombres as coordinador_nombres,
            u.apellidos as coordinador_apellidos,
            p.titulo as proyecto_titulo,
            est.nombres as estudiante_nombres,
            est.apellidos as estudiante_apellidos
          FROM proyecto_usuarios pu
          INNER JOIN usuarios u ON pu.usuario_id = u.id
          INNER JOIN proyectos p ON pu.proyecto_id = p.id
          INNER JOIN usuarios est ON p.estudiante_id = est.id
          WHERE pu.proyecto_id = ? AND pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [project.id, coordinator.id]);

        if (verification.length > 0) {
          const v = verification[0];
          console.log('✅ Verificación exitosa:');
          console.log(`   Coordinador: ${v.coordinador_nombres} ${v.coordinador_apellidos}`);
          console.log(`   Proyecto: ${v.proyecto_titulo}`);
          console.log(`   Estudiante: ${v.estudiante_nombres} ${v.estudiante_apellidos}`);
          console.log(`   Fecha asignación: ${v.fecha_asignacion}`);

          // 5. Probar el método coordinatorStudents
          console.log('\n📋 Paso 5: Probando método coordinatorStudents...');
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
          `, [coordinator.id]);

          console.log(`✅ Estudiantes encontrados para el coordinador: ${students.length}`);
          students.forEach(student => {
            console.log(`   - ${student.nombres} ${student.apellidos} (Proyecto: ${student.proyecto_titulo})`);
          });

        } else {
          console.log('❌ Error en la verificación');
        }
      }
    }

    console.log('\n🎉 Proceso completado');

  } catch (error) {
    console.error('❌ Error durante la corrección:', error);
  } finally {
    await pool.end();
  }
}

fixCoordinatorAssignment();