const { pool } = require('./src/config/database');

async function fixDeliverableAssignment() {
  try {
    console.log('=== SOLUCIONANDO ASIGNACIÓN DE ENTREGABLES ===\n');
    
    // 1. Asignar el primer estudiante disponible al proyecto sin asignar
    console.log('1. Asignando estudiante al proyecto...');
    
    const studentId = 2; // jostin fabian
    const projectId = 2; // proyecto1
    
    await pool.execute(`
      UPDATE proyectos 
      SET estudiante_id = ?, updated_at = NOW()
      WHERE id = ?
    `, [studentId, projectId]);
    
    console.log(`✅ Estudiante ID ${studentId} asignado al proyecto ID ${projectId}`);
    
    // 2. Verificar la asignación
    console.log('\n2. Verificando asignación...');
    const [projectCheck] = await pool.execute(`
      SELECT 
        p.id, p.titulo, p.estudiante_id,
        u.nombres, u.apellidos, u.email
      FROM proyectos p
      LEFT JOIN usuarios u ON p.estudiante_id = u.id
      WHERE p.id = ?
    `, [projectId]);
    
    if (projectCheck.length > 0) {
      const project = projectCheck[0];
      console.log(`   Proyecto: ${project.titulo} (ID: ${project.id})`);
      console.log(`   Estudiante: ${project.nombres} ${project.apellidos} (${project.email})`);
    }
    
    // 3. Verificar entregables del estudiante ahora
    console.log('\n3. Verificando entregables del estudiante después de la asignación...');
    const [studentDeliverables] = await pool.execute(`
      SELECT 
        e.id, e.titulo, e.estado, e.fecha_entrega,
        p.titulo as proyecto_titulo
      FROM entregables e
      LEFT JOIN proyectos p ON e.proyecto_id = p.id
      WHERE p.estudiante_id = ?
      ORDER BY e.created_at DESC
    `, [studentId]);
    
    console.log(`   Total entregables encontrados: ${studentDeliverables.length}`);
    studentDeliverables.forEach(d => {
      console.log(`   - ${d.titulo} | Proyecto: ${d.proyecto_titulo} | Estado: ${d.estado}`);
    });
    
    // 4. También agregar a la tabla proyecto_usuarios si no existe
    console.log('\n4. Verificando tabla proyecto_usuarios...');
    const [existingAssignment] = await pool.execute(`
      SELECT id FROM proyecto_usuarios 
      WHERE proyecto_id = ? AND usuario_id = ?
    `, [projectId, studentId]);
    
    if (existingAssignment.length === 0) {
      await pool.execute(`
        INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
        VALUES (?, ?, 'estudiante', NOW(), 'activo')
      `, [projectId, studentId]);
      
      console.log('✅ Usuario agregado a la tabla proyecto_usuarios');
    } else {
      console.log('ℹ️ Usuario ya existe en proyecto_usuarios');
    }
    
    console.log('\n🎉 PROBLEMA SOLUCIONADO:');
    console.log('   - El proyecto ahora tiene un estudiante asignado');
    console.log('   - Los entregables del proyecto ahora aparecerán en la vista del estudiante');
    console.log('   - El estudiante puede acceder a sus entregables desde /student/deliverables');
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixDeliverableAssignment();