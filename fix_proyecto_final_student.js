const { pool } = require('./src/config/database');

async function fixProyectoFinalStudent() {
  try {
    console.log('🔧 Corrigiendo asignación del estudiante principal del proyecto final...\n');

    // 1. Verificar el estado actual
    const [currentState] = await pool.execute(`
      SELECT 
        p.id as proyecto_id,
        p.titulo,
        p.estudiante_id,
        u_actual.email as estudiante_actual_email,
        u_esperado.id as estudiante_esperado_id,
        u_esperado.email as estudiante_esperado_email
      FROM proyectos p
      LEFT JOIN usuarios u_actual ON p.estudiante_id = u_actual.id
      CROSS JOIN usuarios u_esperado
      WHERE p.titulo = 'proyecto final' 
      AND u_esperado.email = 'estufinal2@test.com'
    `);

    if (currentState.length === 0) {
      console.log('❌ No se encontró el proyecto final o el usuario estufinal2@test.com');
      await pool.end();
      return;
    }

    const state = currentState[0];
    console.log('📋 Estado actual:');
    console.log(`   Proyecto: ${state.titulo} (ID: ${state.proyecto_id})`);
    console.log(`   Estudiante actual: ${state.estudiante_actual_email || 'Ninguno'}`);
    console.log(`   Estudiante esperado: ${state.estudiante_esperado_email}`);

    // 2. Actualizar el estudiante principal del proyecto
    console.log('\n🔧 Actualizando estudiante principal...');
    await pool.execute(`
      UPDATE proyectos 
      SET estudiante_id = ? 
      WHERE id = ?
    `, [state.estudiante_esperado_id, state.proyecto_id]);

    console.log('✅ Estudiante principal actualizado');

    // 3. Verificar que estufinal2@test.com esté en proyecto_usuarios
    const [participantCheck] = await pool.execute(`
      SELECT * FROM proyecto_usuarios 
      WHERE proyecto_id = ? AND usuario_id = ? AND rol = 'estudiante'
    `, [state.proyecto_id, state.estudiante_esperado_id]);

    if (participantCheck.length === 0) {
      console.log('🔧 Agregando a estufinal2@test.com como participante del proyecto...');
      await pool.execute(`
        INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion)
        VALUES (?, ?, 'estudiante', NOW())
      `, [state.proyecto_id, state.estudiante_esperado_id]);
      console.log('✅ Participante agregado');
    } else {
      console.log('✅ estufinal2@test.com ya está como participante del proyecto');
    }

    // 4. Verificar el resultado final
    console.log('\n📋 Verificación final:');
    const [finalCheck] = await pool.execute(`
      SELECT 
        p.id,
        p.titulo,
        p.estado,
        u.nombres,
        u.apellidos,
        u.email
      FROM proyectos p
      INNER JOIN usuarios u ON p.estudiante_id = u.id
      WHERE p.id = ?
    `, [state.proyecto_id]);

    if (finalCheck.length > 0) {
      const result = finalCheck[0];
      console.log(`   ✅ Proyecto: ${result.titulo}`);
      console.log(`   ✅ Estudiante principal: ${result.nombres} ${result.apellidos} (${result.email})`);
    }

    // 5. Probar la consulta coordinatorStudents
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

      console.log(`   Estudiantes que debería ver: ${students.length}`);
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

fixProyectoFinalStudent();