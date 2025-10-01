const { pool } = require('./src/config/database');

async function checkCoordinator107() {
  try {
    console.log('🔍 Verificando coordinador ID 107...\n');
    
    // Verificar si existe el coordinador
    const [coordinator] = await pool.execute(
      'SELECT id, nombres, apellidos FROM usuarios WHERE id = 107'
    );
    
    if (coordinator.length === 0) {
      console.log('❌ Coordinador ID 107 no encontrado');
      return;
    }
    
    console.log(`✅ Coordinador: ${coordinator[0].nombres} ${coordinator[0].apellidos}`);
    
    // Verificar proyectos asignados
    const [projects] = await pool.execute(`
      SELECT p.id, p.titulo, p.estado
      FROM proyectos p
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = 107 AND pu.rol = 'coordinador'
    `);
    
    console.log(`📋 Proyectos asignados: ${projects.length}`);
    projects.forEach(project => {
      console.log(`   - Proyecto ${project.id}: ${project.titulo} (${project.estado})`);
    });
    
    // Verificar estudiantes
    const [students] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, p.titulo as proyecto_titulo
      FROM usuarios u
      INNER JOIN proyectos p ON u.id = p.estudiante_id
      INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = 107 AND pu.rol = 'coordinador'
    `);
    
    console.log(`👥 Estudiantes asignados: ${students.length}`);
    students.forEach(student => {
      console.log(`   - ${student.nombres} ${student.apellidos} (Proyecto: ${student.proyecto_titulo})`);
    });
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkCoordinator107();