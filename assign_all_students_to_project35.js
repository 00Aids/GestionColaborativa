const { pool } = require('./src/config/database');

async function assignAllStudentsToProject35() {
  const connection = await pool.getConnection();

  try {
    console.log('Verificando y asignando estudiantes al proyecto 35...\n');
    
    // Verificar asignaciones actuales en project_members
    console.log('=== ASIGNACIONES ACTUALES EN PROJECT_MEMBERS ===');
    const [currentMembers] = await connection.execute(`
      SELECT pm.*, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM project_members pm
      JOIN usuarios u ON pm.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE pm.proyecto_id = 35
    `);
    
    if (currentMembers.length > 0) {
      console.log('Miembros actuales:');
      currentMembers.forEach(member => {
        console.log(`- ${member.nombres} ${member.apellidos} (${member.email})`);
        console.log(`  Rol en proyecto: ${member.rol_en_proyecto}, Activo: ${member.activo}`);
      });
    } else {
      console.log('No hay miembros asignados actualmente');
    }
    
    // Obtener los 3 estudiantes del área 12
    console.log('\n=== ESTUDIANTES DEL ÁREA 12 ===');
    const [studentsArea12] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre, u.area_trabajo_id
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.area_trabajo_id = 12 AND r.nombre = 'Estudiante'
      ORDER BY u.nombres
    `);
    
    if (studentsArea12.length === 0) {
      console.log('❌ No se encontraron estudiantes en el área 12');
      return;
    }
    
    console.log(`Encontrados ${studentsArea12.length} estudiantes:`);
    studentsArea12.forEach(student => {
      console.log(`- ${student.nombres} ${student.apellidos} (${student.email}) - ID: ${student.id}`);
    });
    
    // Asignar cada estudiante al proyecto si no está ya asignado
    console.log('\n=== ASIGNANDO ESTUDIANTES AL PROYECTO ===');
    
    for (const student of studentsArea12) {
      // Verificar si ya está asignado
      const [existing] = await connection.execute(
        'SELECT * FROM project_members WHERE proyecto_id = 35 AND usuario_id = ?',
        [student.id]
      );
      
      if (existing.length > 0) {
        console.log(`✓ ${student.nombres} ${student.apellidos} ya está asignado`);
        
        // Asegurar que esté activo
        if (!existing[0].activo) {
          await connection.execute(
            'UPDATE project_members SET activo = 1 WHERE proyecto_id = 35 AND usuario_id = ?',
            [student.id]
          );
          console.log(`  ↳ Activado en el proyecto`);
        }
      } else {
        // Asignar al proyecto
        await connection.execute(`
          INSERT INTO project_members (proyecto_id, usuario_id, rol_en_proyecto, activo, fecha_union)
          VALUES (35, ?, 'estudiante', 1, NOW())
        `, [student.id]);
        
        console.log(`✅ ${student.nombres} ${student.apellidos} asignado al proyecto`);
      }
    }
    
    // Asignar el primer estudiante como estudiante principal del proyecto
    console.log('\n=== ASIGNANDO ESTUDIANTE PRINCIPAL ===');
    const principalStudentId = studentsArea12[0].id;
    
    await connection.execute(
      'UPDATE proyectos SET estudiante_id = ?, updated_at = NOW() WHERE id = 35',
      [principalStudentId]
    );
    
    console.log(`✅ ${studentsArea12[0].nombres} ${studentsArea12[0].apellidos} asignado como estudiante principal`);
    
    // Verificar las asignaciones finales
    console.log('\n=== VERIFICACIÓN FINAL ===');
    const [finalMembers] = await connection.execute(`
      SELECT pm.*, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM project_members pm
      JOIN usuarios u ON pm.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE pm.proyecto_id = 35 AND pm.activo = 1
      ORDER BY u.nombres
    `);
    
    console.log(`Total de miembros activos: ${finalMembers.length}`);
    finalMembers.forEach(member => {
      console.log(`- ${member.nombres} ${member.apellidos} (${member.email})`);
      console.log(`  Rol: ${member.rol_en_proyecto}, Fecha unión: ${member.fecha_union}`);
    });
    
    // Verificar el proyecto
    const [project] = await connection.execute(
      'SELECT id, titulo, estudiante_id, director_id, area_trabajo_id FROM proyectos WHERE id = 35'
    );
    
    if (project.length > 0) {
      console.log(`\nProyecto: ${project[0].titulo}`);
      console.log(`Estudiante principal ID: ${project[0].estudiante_id}`);
      console.log(`Director ID: ${project[0].director_id}`);
      console.log(`Área de trabajo ID: ${project[0].area_trabajo_id}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

assignAllStudentsToProject35();