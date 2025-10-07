const { pool } = require('./src/config/database');

async function verifyCurrentStructure() {
  try {
    console.log('🔍 Verificando estructura actual del sistema...\n');

    // 1. Verificar roles disponibles
    const [roles] = await pool.execute(`
      SELECT id, nombre FROM roles ORDER BY id
    `);

    console.log('👥 Roles en el sistema:');
    roles.forEach(role => {
      console.log(`   - ID: ${role.id} | ${role.nombre}`);
    });

    // 2. Verificar el proyecto final y sus participantes
    console.log('\n📋 Proyecto final y sus participantes:');
    const [proyectoParticipantes] = await pool.execute(`
      SELECT 
        p.id as proyecto_id,
        p.titulo,
        p.estado,
        u.id as usuario_id,
        u.nombres,
        u.apellidos,
        u.email,
        r.nombre as rol_usuario,
        pu.rol as rol_en_proyecto
      FROM proyectos p
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      INNER JOIN usuarios u ON pu.usuario_id = u.id
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE p.titulo = 'proyecto final'
      ORDER BY pu.rol, u.apellidos
    `);

    if (proyectoParticipantes.length > 0) {
      console.log(`   Proyecto: ${proyectoParticipantes[0].titulo} (ID: ${proyectoParticipantes[0].proyecto_id})`);
      console.log(`   Estado: ${proyectoParticipantes[0].estado}`);
      console.log('   Participantes:');
      
      proyectoParticipantes.forEach(participante => {
        console.log(`     - ${participante.nombres} ${participante.apellidos}`);
        console.log(`       Email: ${participante.email}`);
        console.log(`       Rol del usuario: ${participante.rol_usuario}`);
        console.log(`       Rol en proyecto: ${participante.rol_en_proyecto}`);
        console.log('');
      });
    }

    // 3. Verificar la consulta coordinatorStudents (debería mostrar estudiantes del proyecto)
    console.log('🔍 Probando consulta coordinatorStudents para coordifinal1@test.com:');
    const [coordUser] = await pool.execute(`
      SELECT id FROM usuarios WHERE email = 'coordifinal1@test.com'
    `);

    if (coordUser.length > 0) {
      const [students] = await pool.execute(`
        SELECT DISTINCT 
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          pu_estudiante.rol as rol_estudiante
        FROM usuarios u
        INNER JOIN proyecto_usuarios pu_estudiante ON u.id = pu_estudiante.usuario_id
        INNER JOIN proyectos p ON pu_estudiante.proyecto_id = p.id
        INNER JOIN proyecto_usuarios pu_coordinador ON p.id = pu_coordinador.proyecto_id
        WHERE pu_coordinador.usuario_id = ? 
        AND pu_coordinador.rol = 'coordinador'
        AND pu_estudiante.rol = 'estudiante'
        ORDER BY u.apellidos, u.nombres
      `, [coordUser[0].id]);

      console.log(`   Estudiantes encontrados: ${students.length}`);
      students.forEach(student => {
        console.log(`     - ${student.nombres} ${student.apellidos} (${student.email})`);
        console.log(`       Proyecto: ${student.proyecto_titulo} (${student.proyecto_estado})`);
        console.log(`       Rol: ${student.rol_estudiante}`);
      });
    }

    // 4. Verificar si hay campo estudiante_id en proyectos (que ya no debería usarse)
    console.log('\n🔍 Verificando estructura de tabla proyectos:');
    const [tableStructure] = await pool.execute(`
      DESCRIBE proyectos
    `);

    const hasEstudianteId = tableStructure.some(column => column.Field === 'estudiante_id');
    console.log(`   Campo estudiante_id presente: ${hasEstudianteId ? '❌ SÍ (debería eliminarse)' : '✅ NO'}`);

    if (hasEstudianteId) {
      console.log('   ⚠️  El campo estudiante_id aún existe pero ya no debería usarse');
      console.log('   ⚠️  Los estudiantes ahora se manejan solo a través de proyecto_usuarios');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyCurrentStructure();