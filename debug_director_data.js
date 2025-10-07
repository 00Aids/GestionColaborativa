const mysql = require('mysql2/promise');

async function debugDirectorData() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
  });

  try {
    console.log('=== DEBUGGING DIRECTOR DATA ===\n');

    // 1. Verificar todos los usuarios con rol de director
    console.log('1. Usuarios con rol de director:');
    const [directors] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'director'
    `);
    console.log(`Directores encontrados: ${directors.length}`);
    directors.forEach(d => {
      console.log(`  - ID: ${d.id}, Nombre: ${d.nombres} ${d.apellidos}, Email: ${d.email}`);
    });

    // 2. Verificar todos los proyectos
    console.log('\n2. Todos los proyectos en la base de datos:');
    const [allProjects] = await connection.execute(`
      SELECT id, titulo, estado, director_id, estudiante_id, created_at
      FROM proyectos
      ORDER BY created_at DESC
    `);
    console.log(`Proyectos totales: ${allProjects.length}`);
    allProjects.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}, Director ID: ${p.director_id}, Estudiante ID: ${p.estudiante_id}`);
    });

    // 3. Verificar proyectos por cada director
    console.log('\n3. Proyectos por director:');
    for (const director of directors) {
      const [directorProjects] = await connection.execute(
        'SELECT id, titulo, estado FROM proyectos WHERE director_id = ?',
        [director.id]
      );
      console.log(`  Director ${director.nombres} ${director.apellidos} (ID: ${director.id}): ${directorProjects.length} proyectos`);
      directorProjects.forEach(p => {
        console.log(`    - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}`);
      });
    }

    // 4. Verificar tabla proyecto_usuarios
    console.log('\n4. Registros en proyecto_usuarios:');
    const [puRecords] = await connection.execute(`
      SELECT pu.*, p.titulo as proyecto_titulo, u.nombres, u.apellidos
      FROM proyecto_usuarios pu
      JOIN proyectos p ON pu.proyecto_id = p.id
      JOIN usuarios u ON pu.usuario_id = u.id
      ORDER BY pu.proyecto_id
    `);
    console.log(`Registros en proyecto_usuarios: ${puRecords.length}`);
    puRecords.forEach(pu => {
      console.log(`  - Proyecto: ${pu.proyecto_titulo}, Usuario: ${pu.nombres} ${pu.apellidos}, Rol: ${pu.rol}, Estado: ${pu.estado}`);
    });

    // 5. Verificar si hay datos de sesión simulados
    console.log('\n5. Simulando consulta con diferentes IDs de director:');
    for (let directorId = 1; directorId <= 5; directorId++) {
      const [testResults] = await connection.execute(
        'SELECT COUNT(*) as count FROM proyectos WHERE director_id = ?',
        [directorId]
      );
      if (testResults[0].count > 0) {
        console.log(`  Director ID ${directorId}: ${testResults[0].count} proyectos`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugDirectorData();