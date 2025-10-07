const { pool } = require('./src/config/database');

async function checkCurrentUser() {
  try {
    console.log('🔍 Verificando usuario actual y sus asignaciones...\n');

    // 1. Verificar todos los coordinadores y sus asignaciones
    console.log('📋 1. Coordinadores y sus asignaciones:');
    const [coordinatorAssignments] = await pool.execute(`
      SELECT DISTINCT
        u.id as coordinador_id,
        u.nombres as coordinador_nombres,
        u.apellidos as coordinador_apellidos,
        u.email as coordinador_email,
        COUNT(pu.proyecto_id) as proyectos_asignados,
        GROUP_CONCAT(p.titulo SEPARATOR ', ') as proyectos_titulos
      FROM usuarios u
      LEFT JOIN proyecto_usuarios pu ON u.id = pu.usuario_id AND pu.rol = 'coordinador'
      LEFT JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.rol_id = 3
      GROUP BY u.id, u.nombres, u.apellidos, u.email
      ORDER BY proyectos_asignados DESC
    `);

    coordinatorAssignments.forEach(coord => {
      console.log(`👤 ${coord.coordinador_nombres} ${coord.coordinador_apellidos}`);
      console.log(`   📧 Email: ${coord.coordinador_email}`);
      console.log(`   📊 Proyectos asignados: ${coord.proyectos_asignados}`);
      if (coord.proyectos_titulos) {
        console.log(`   📋 Proyectos: ${coord.proyectos_titulos}`);
      }
      console.log('');
    });

    // 2. Verificar estudiantes para cada coordinador con asignaciones
    console.log('📋 2. Estudiantes por coordinador:');
    for (const coord of coordinatorAssignments) {
      if (coord.proyectos_asignados > 0) {
        const [students] = await pool.execute(`
          SELECT DISTINCT 
            u.nombres,
            u.apellidos,
            p.titulo as proyecto_titulo
          FROM usuarios u
          INNER JOIN proyectos p ON u.id = p.estudiante_id
          INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
          WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [coord.coordinador_id]);

        console.log(`👤 ${coord.coordinador_nombres} ${coord.coordinador_apellidos}:`);
        console.log(`   👥 Estudiantes: ${students.length}`);
        students.forEach(student => {
          console.log(`      - ${student.nombres} ${student.apellidos} (${student.proyecto_titulo})`);
        });
        console.log('');
      }
    }

    // 3. Sugerir solución
    console.log('📋 3. Solución sugerida:');
    console.log('Para probar la funcionalidad, usa uno de estos coordinadores:');
    coordinatorAssignments
      .filter(coord => coord.proyectos_asignados > 0)
      .forEach(coord => {
        console.log(`   📧 ${coord.coordinador_email} (contraseña: 123456)`);
        console.log(`      Tiene ${coord.proyectos_asignados} proyecto(s) asignado(s)`);
      });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCurrentUser();