const { pool } = require('./src/config/database');

async function fixStudentAreaTrabajo() {
  try {
    console.log('=== CORRIGIENDO AREA_TRABAJO_ID DE ESTUDIANTES ===\n');

    // 1. Identificar estudiantes con area_trabajo_id null que están en proyectos
    console.log('1. ESTUDIANTES CON AREA_TRABAJO_ID NULL EN PROYECTOS:');
    const [studentsToFix] = await pool.execute(`
      SELECT DISTINCT u.id, u.email, u.nombres, u.apellidos, 
             p.id as proyecto_id, p.titulo, p.area_trabajo_id as proyecto_area
      FROM usuarios u
      JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Estudiante')
        AND u.area_trabajo_id IS NULL
        AND p.area_trabajo_id IS NOT NULL
      ORDER BY u.email
    `);

    if (studentsToFix.length === 0) {
      console.log('No hay estudiantes que necesiten corrección.');
      return;
    }

    studentsToFix.forEach(student => {
      console.log(`- ${student.email} (ID: ${student.id})`);
      console.log(`  Proyecto: ${student.titulo} (ID: ${student.proyecto_id})`);
      console.log(`  Área de trabajo del proyecto: ${student.proyecto_area}`);
    });

    // 2. Actualizar area_trabajo_id de los estudiantes
    console.log('\n2. ACTUALIZANDO AREA_TRABAJO_ID:');
    
    for (const student of studentsToFix) {
      try {
        await pool.execute(`
          UPDATE usuarios 
          SET area_trabajo_id = ? 
          WHERE id = ?
        `, [student.proyecto_area, student.id]);
        
        console.log(`✓ ${student.email}: area_trabajo_id actualizado a ${student.proyecto_area}`);
      } catch (error) {
        console.error(`✗ Error actualizando ${student.email}:`, error.message);
      }
    }

    // 3. Verificar los cambios
    console.log('\n3. VERIFICACIÓN POST-ACTUALIZACIÓN:');
    const [verification] = await pool.execute(`
      SELECT u.id, u.email, u.area_trabajo_id, 
             p.id as proyecto_id, p.area_trabajo_id as proyecto_area,
             CASE 
               WHEN u.area_trabajo_id = p.area_trabajo_id THEN 'COINCIDE' 
               ELSE 'NO COINCIDE' 
             END as estado_acceso
      FROM usuarios u
      JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Estudiante')
        AND u.id IN (${studentsToFix.map(s => s.id).join(',')})
      ORDER BY u.email
    `);

    verification.forEach(v => {
      console.log(`- ${v.email}: ${v.estado_acceso}`);
      console.log(`  Usuario área: ${v.area_trabajo_id}, Proyecto área: ${v.proyecto_area}`);
    });

    console.log('\n✓ Corrección completada.');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixStudentAreaTrabajo();