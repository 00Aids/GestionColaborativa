const { pool } = require('./src/config/database');

async function checkUserAreaAccess() {
  const connection = await pool.getConnection();

  try {
    console.log('Verificando acceso por área de trabajo...\n');
    
    // Información del proyecto 35
    console.log('=== PROYECTO 35 ===');
    const [project] = await connection.execute(
      'SELECT id, titulo, area_trabajo_id, estudiante_id, director_id FROM proyectos WHERE id = 35'
    );
    
    if (project.length > 0) {
      console.log(`Proyecto: ${project[0].titulo}`);
      console.log(`Área de trabajo ID: ${project[0].area_trabajo_id}`);
      console.log(`Estudiante ID: ${project[0].estudiante_id}`);
      console.log(`Director ID: ${project[0].director_id}`);
    }
    
    // Información del área de trabajo
    console.log('\n=== ÁREA DE TRABAJO DEL PROYECTO ===');
    const [area] = await connection.execute(
      'SELECT * FROM areas_trabajo WHERE id = ?',
      [project[0].area_trabajo_id]
    );
    
    if (area.length > 0) {
      console.log(`Nombre: ${area[0].nombre}`);
      console.log(`Código: ${area[0].codigo}`);
      console.log(`Descripción: ${area[0].descripcion}`);
    }
    
    // Usuarios en la misma área de trabajo
    console.log('\n=== USUARIOS EN LA MISMA ÁREA DE TRABAJO ===');
    const [usersInArea] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre, u.area_trabajo_id
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.area_trabajo_id = ?
      ORDER BY r.nombre, u.nombres
    `, [project[0].area_trabajo_id]);
    
    if (usersInArea.length > 0) {
      usersInArea.forEach(user => {
        console.log(`- ${user.nombres} ${user.apellidos} (${user.email})`);
        console.log(`  Rol: ${user.rol_nombre}, Área ID: ${user.area_trabajo_id}`);
      });
    } else {
      console.log('No hay usuarios en esta área de trabajo');
    }
    
    // Verificar si hay usuarios estudiantes sin área asignada
    console.log('\n=== ESTUDIANTES SIN ÁREA ASIGNADA ===');
    const [studentsNoArea] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre, u.area_trabajo_id
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Estudiante' AND (u.area_trabajo_id IS NULL OR u.area_trabajo_id = 0)
      ORDER BY u.nombres
    `);
    
    if (studentsNoArea.length > 0) {
      studentsNoArea.forEach(user => {
        console.log(`- ${user.nombres} ${user.apellidos} (${user.email})`);
        console.log(`  ID: ${user.id}, Área ID: ${user.area_trabajo_id}`);
      });
    } else {
      console.log('Todos los estudiantes tienen área asignada');
    }
    
    // Verificar relaciones en project_members
    console.log('\n=== MIEMBROS DEL PROYECTO (project_members) ===');
    const [projectMembers] = await connection.execute(`
      SELECT pm.*, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM project_members pm
      JOIN usuarios u ON pm.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE pm.proyecto_id = 35 AND pm.activo = 1
    `);
    
    if (projectMembers.length > 0) {
      projectMembers.forEach(member => {
        console.log(`- ${member.nombres} ${member.apellidos} (${member.email})`);
        console.log(`  Rol en proyecto: ${member.rol_en_proyecto}, Rol sistema: ${member.rol_nombre}`);
      });
    } else {
      console.log('No hay miembros en project_members para este proyecto');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

checkUserAreaAccess();