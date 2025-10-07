const { pool } = require('./src/config/database');

async function checkSpecificUser() {
  try {
    console.log('🔍 Verificando usuario coordifinal1@test.com...\n');

    // 1. Verificar si el usuario existe
    const [user] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.email = 'coordifinal1@test.com'
    `);

    if (user.length === 0) {
      console.log('❌ Usuario coordifinal1@test.com no encontrado');
      await pool.end();
      return;
    }

    const userData = user[0];
    console.log('✅ Usuario encontrado:');
    console.log(`   ID: ${userData.id}`);
    console.log(`   Nombre: ${userData.nombres} ${userData.apellidos}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Rol: ${userData.rol_nombre}`);

    // 2. Verificar asignaciones de proyectos
    console.log('\n📋 Verificando asignaciones de proyectos...');
    const [assignments] = await pool.execute(`
      SELECT 
        pu.proyecto_id,
        pu.rol,
        p.titulo as proyecto_titulo,
        p.estado as proyecto_estado,
        u_est.nombres as estudiante_nombres,
        u_est.apellidos as estudiante_apellidos
      FROM proyecto_usuarios pu
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      LEFT JOIN usuarios u_est ON p.estudiante_id = u_est.id
      WHERE pu.usuario_id = ?
    `, [userData.id]);

    console.log(`✅ Asignaciones encontradas: ${assignments.length}`);
    assignments.forEach(assign => {
      console.log(`   - Proyecto: ${assign.proyecto_titulo} (${assign.proyecto_estado})`);
      console.log(`     Rol: ${assign.rol}`);
      if (assign.estudiante_nombres) {
        console.log(`     Estudiante: ${assign.estudiante_nombres} ${assign.estudiante_apellidos}`);
      } else {
        console.log(`     Sin estudiante asignado`);
      }
    });

    // 3. Probar la consulta específica del método coordinatorStudents
    console.log('\n📋 Probando consulta coordinatorStudents...');
    const [students] = await pool.execute(`
      SELECT DISTINCT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        p.titulo as proyecto_titulo,
        p.id as proyecto_id,
        p.estado as proyecto_estado
      FROM usuarios u
      INNER JOIN proyectos p ON u.id = p.estudiante_id
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
      ORDER BY u.apellidos, u.nombres
    `, [userData.id]);

    console.log(`✅ Estudiantes que debería ver: ${students.length}`);
    students.forEach(student => {
      console.log(`   - ${student.nombres} ${student.apellidos}`);
      console.log(`     Email: ${student.email}`);
      console.log(`     Proyecto: ${student.proyecto_titulo} (${student.proyecto_estado})`);
    });

    // 4. Verificar si hay problemas con la sesión
    console.log('\n📋 Recomendaciones:');
    if (students.length > 0) {
      console.log('✅ El usuario SÍ tiene estudiantes asignados.');
      console.log('   Posibles causas del problema:');
      console.log('   1. Problema de sesión - cerrar sesión y volver a iniciar');
      console.log('   2. Cache del navegador - limpiar cache');
      console.log('   3. Error en el controlador - revisar logs del servidor');
    } else {
      console.log('❌ El usuario NO tiene estudiantes asignados.');
      console.log('   Necesita que se le asignen proyectos con estudiantes.');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSpecificUser();