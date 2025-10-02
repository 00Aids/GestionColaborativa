const { pool } = require('./src/config/database');

async function checkUserProjectPermissions() {
  const connection = await pool.getConnection();

  try {
    console.log('Verificando permisos de usuario para el proyecto 35...\n');
    
    // Obtener información del proyecto 35
    console.log('=== INFORMACIÓN DEL PROYECTO 35 ===');
    const [project] = await connection.execute(
      'SELECT * FROM proyectos WHERE id = 35'
    );
    
    if (project.length > 0) {
      console.log('Proyecto encontrado:');
      console.log(`- ID: ${project[0].id}`);
      console.log(`- Título: ${project[0].titulo}`);
      console.log(`- Estudiante ID: ${project[0].estudiante_id}`);
      console.log(`- Director ID: ${project[0].director_id}`);
      console.log(`- Estado: ${project[0].estado}`);
      console.log(`- Área de trabajo ID: ${project[0].area_trabajo_id}`);
    } else {
      console.log('❌ Proyecto 35 no encontrado');
      return;
    }
    
    // Obtener información del estudiante asignado
    console.log('\n=== ESTUDIANTE ASIGNADO ===');
    if (project[0].estudiante_id) {
      const [student] = await connection.execute(
        'SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
        [project[0].estudiante_id]
      );
      
      if (student.length > 0) {
        console.log(`- Nombre: ${student[0].nombres} ${student[0].apellidos}`);
        console.log(`- Email: ${student[0].email}`);
        console.log(`- Rol: ${student[0].rol_nombre}`);
        console.log(`- ID: ${student[0].id}`);
      }
    }
    
    // Obtener información del director asignado
    console.log('\n=== DIRECTOR ASIGNADO ===');
    if (project[0].director_id) {
      const [director] = await connection.execute(
        'SELECT u.*, r.nombre as rol_nombre FROM usuarios u LEFT JOIN roles r ON u.rol_id = r.id WHERE u.id = ?',
        [project[0].director_id]
      );
      
      if (director.length > 0) {
        console.log(`- Nombre: ${director[0].nombres} ${director[0].apellidos}`);
        console.log(`- Email: ${director[0].email}`);
        console.log(`- Rol: ${director[0].rol_nombre}`);
        console.log(`- ID: ${director[0].id}`);
      }
    }
    
    // Verificar miembros del proyecto
    console.log('\n=== MIEMBROS DEL PROYECTO ===');
    const [members] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre, pm.rol as rol_proyecto
      FROM proyecto_miembros pm
      JOIN usuarios u ON pm.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE pm.proyecto_id = 35
    `);
    
    if (members.length > 0) {
      members.forEach(member => {
        console.log(`- ${member.nombres} ${member.apellidos} (${member.email})`);
        console.log(`  Rol sistema: ${member.rol_nombre}, Rol proyecto: ${member.rol_proyecto}`);
      });
    } else {
      console.log('No hay miembros adicionales en el proyecto');
    }
    
    // Verificar todos los usuarios estudiantes para ver quién podría acceder
    console.log('\n=== USUARIOS ESTUDIANTES DISPONIBLES ===');
    const [students] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Estudiante'
      ORDER BY u.id
    `);
    
    students.forEach(student => {
      console.log(`- ID: ${student.id} | ${student.nombres} ${student.apellidos} (${student.email})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

checkUserProjectPermissions();