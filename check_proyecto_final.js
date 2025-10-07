const { pool } = require('./src/config/database');

async function checkProyectoFinal() {
  try {
    console.log('🔍 Verificando el estado del "proyecto final"...\n');

    // 1. Verificar el proyecto final y sus asignaciones
    const [proyectoInfo] = await pool.execute(`
      SELECT 
        p.id,
        p.titulo,
        p.descripcion,
        p.estado,
        p.estudiante_id,
        u_estudiante.nombres as estudiante_nombres,
        u_estudiante.apellidos as estudiante_apellidos,
        u_estudiante.email as estudiante_email
      FROM proyectos p
      LEFT JOIN usuarios u_estudiante ON p.estudiante_id = u_estudiante.id
      WHERE p.titulo LIKE '%proyecto final%'
    `);

    console.log('📋 Información del proyecto:');
    proyectoInfo.forEach(proyecto => {
      console.log(`   ID: ${proyecto.id}`);
      console.log(`   Título: ${proyecto.titulo}`);
      console.log(`   Estado: ${proyecto.estado}`);
      console.log(`   Estudiante ID: ${proyecto.estudiante_id}`);
      if (proyecto.estudiante_nombres) {
        console.log(`   Estudiante: ${proyecto.estudiante_nombres} ${proyecto.estudiante_apellidos}`);
        console.log(`   Email: ${proyecto.estudiante_email}`);
      } else {
        console.log(`   Estudiante: No asignado`);
      }
      console.log('');
    });

    // 2. Verificar si existe el usuario estufinal2@test.com
    const [estudianteEspecifico] = await pool.execute(`
      SELECT id, nombres, apellidos, email, rol_id
      FROM usuarios 
      WHERE email = 'estufinal2@test.com'
    `);

    console.log('👤 Verificando usuario estufinal2@test.com:');
    if (estudianteEspecifico.length > 0) {
      const estudiante = estudianteEspecifico[0];
      console.log(`   ✅ Usuario encontrado:`);
      console.log(`   ID: ${estudiante.id}`);
      console.log(`   Nombre: ${estudiante.nombres} ${estudiante.apellidos}`);
      console.log(`   Email: ${estudiante.email}`);
      console.log(`   Rol ID: ${estudiante.rol_id}`);

      // Verificar si este estudiante está asignado a algún proyecto
      const [proyectosAsignados] = await pool.execute(`
        SELECT p.id, p.titulo, p.estado
        FROM proyectos p
        WHERE p.estudiante_id = ?
      `, [estudiante.id]);

      console.log(`   Proyectos asignados: ${proyectosAsignados.length}`);
      proyectosAsignados.forEach(proyecto => {
        console.log(`     - ${proyecto.titulo} (ID: ${proyecto.id}, Estado: ${proyecto.estado})`);
      });
    } else {
      console.log('   ❌ Usuario estufinal2@test.com no encontrado');
    }

    // 3. Verificar coordinadores del proyecto final
    console.log('\n👥 Coordinadores del proyecto final:');
    const [coordinadores] = await pool.execute(`
      SELECT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        pu.rol
      FROM usuarios u
      INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE p.titulo LIKE '%proyecto final%'
    `);

    coordinadores.forEach(coord => {
      console.log(`   - ${coord.nombres} ${coord.apellidos} (${coord.email}) - Rol: ${coord.rol}`);
    });

    // 4. Mostrar la consulta que usa coordinatorStudents
    console.log('\n🔍 Probando consulta coordinatorStudents para coordifinal1@test.com:');
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
          p.estado as proyecto_estado
        FROM usuarios u
        INNER JOIN proyectos p ON u.id = p.estudiante_id
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        ORDER BY u.apellidos, u.nombres
      `, [coordUser[0].id]);

      console.log(`   Estudiantes encontrados: ${students.length}`);
      students.forEach(student => {
        console.log(`     - ${student.nombres} ${student.apellidos} (${student.email})`);
        console.log(`       Proyecto: ${student.proyecto_titulo} (${student.proyecto_estado})`);
      });
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProyectoFinal();