const { pool } = require('./src/config/database');

async function assignStudentToProject35() {
  const connection = await pool.getConnection();

  try {
    console.log('Asignando estudiante al proyecto 35...\n');
    
    // Obtener el ID del usuario "Yopi otra"
    const [user] = await connection.execute(
      'SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ?',
      ['j@test.com']
    );
    
    if (user.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const studentId = user[0].id;
    console.log(`Usuario encontrado: ${user[0].nombres} ${user[0].apellidos} (ID: ${studentId})`);
    
    // Asignar el estudiante al proyecto
    console.log('\nAsignando estudiante al proyecto...');
    await connection.execute(
      'UPDATE proyectos SET estudiante_id = ?, updated_at = NOW() WHERE id = 35',
      [studentId]
    );
    
    console.log('✅ Estudiante asignado correctamente al proyecto 35');
    
    // Verificar la asignación
    console.log('\nVerificando asignación...');
    const [project] = await connection.execute(
      'SELECT id, titulo, estudiante_id, area_trabajo_id FROM proyectos WHERE id = 35'
    );
    
    if (project.length > 0) {
      console.log(`Proyecto: ${project[0].titulo}`);
      console.log(`Estudiante ID: ${project[0].estudiante_id}`);
      console.log(`Área de trabajo ID: ${project[0].area_trabajo_id}`);
    }
    
    // Verificar que el usuario tenga la misma área de trabajo
    const [studentInfo] = await connection.execute(
      'SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
      [studentId]
    );
    
    if (studentInfo.length > 0) {
      console.log(`\nInformación del estudiante asignado:`);
      console.log(`- Nombre: ${studentInfo[0].nombres} ${studentInfo[0].apellidos}`);
      console.log(`- Email: ${studentInfo[0].email}`);
      console.log(`- Rol: ${studentInfo[0].rol_nombre}`);
      console.log(`- Área de trabajo ID: ${studentInfo[0].area_trabajo_id}`);
      
      if (studentInfo[0].area_trabajo_id === project[0].area_trabajo_id) {
        console.log('✅ El estudiante está en la misma área de trabajo que el proyecto');
      } else {
        console.log('⚠️ El estudiante NO está en la misma área de trabajo que el proyecto');
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

assignStudentToProject35();