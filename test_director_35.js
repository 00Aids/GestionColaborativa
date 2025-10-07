const mysql = require('mysql2/promise');

async function testDirector35() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
  });

  try {
    console.log('=== TESTING DIRECTOR ID 35 (prueba dire) ===\n');

    const directorId = 35;

    // 1. Información del director
    console.log('1. Información del director:');
    const [directorInfo] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE u.id = ?
    `, [directorId]);
    
    if (directorInfo.length > 0) {
      const director = directorInfo[0];
      console.log(`  Director: ${director.nombres} ${director.apellidos} (ID: ${director.id})`);
      console.log(`  Email: ${director.email}`);
      console.log(`  Rol: ${director.rol_nombre}`);
    }

    // 2. Proyectos donde es director directo
    console.log('\n2. Proyectos donde es director directo:');
    const [directProjects] = await connection.execute(
      'SELECT id, titulo, estado FROM proyectos WHERE director_id = ?',
      [directorId]
    );
    console.log(`Proyectos como director directo: ${directProjects.length}`);
    directProjects.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}`);
    });

    // 3. Proyectos donde es coordinador
    console.log('\n3. Proyectos donde es coordinador:');
    const [coordinatorProjects] = await connection.execute(`
      SELECT p.id, p.titulo, p.estado, pu.rol, pu.estado as pu_estado
      FROM proyectos p
      JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = ? AND pu.rol = 'coordinador' AND pu.estado = 'activo'
    `, [directorId]);
    console.log(`Proyectos como coordinador: ${coordinatorProjects.length}`);
    coordinatorProjects.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}, Rol: ${p.rol}, Estado PU: ${p.pu_estado}`);
    });

    // 4. Consulta completa del método findByDirector
    console.log('\n4. Resultado del método findByDirector:');
    const query = `
      SELECT DISTINCT
        p.*,
        CONCAT(u.nombres, ' ', u.apellidos) as estudiante_nombre,
        u.nombres as estudiante_nombres,
        u.apellidos as estudiante_apellidos,
        u.email as estudiante_email,
        CONCAT(d.nombres, ' ', d.apellidos) as director_nombre,
        d.nombres as director_nombres,
        d.apellidos as director_apellidos,
        li.nombre as linea_investigacion,
        li.nombre as linea_investigacion_nombre,
        ca.nombre as ciclo_nombre,
        ca.fecha_inicio as ciclo_fecha_inicio,
        ca.fecha_fin as ciclo_fecha_fin
      FROM proyectos p
      LEFT JOIN usuarios u ON p.estudiante_id = u.id
      LEFT JOIN usuarios d ON p.director_id = d.id
      LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
      LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
      WHERE (
        p.director_id = ? 
        OR EXISTS (
          SELECT 1 FROM proyecto_usuarios pu 
          WHERE pu.proyecto_id = p.id 
            AND pu.usuario_id = ? 
            AND pu.rol = 'coordinador' 
            AND pu.estado = 'activo'
        )
      )
      ORDER BY p.created_at DESC
    `;

    const [findByDirectorResults] = await connection.execute(query, [directorId, directorId]);
    console.log(`Proyectos encontrados por findByDirector: ${findByDirectorResults.length}`);
    findByDirectorResults.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}`);
      console.log(`    Director ID: ${p.director_id}, Director Nombre: ${p.director_nombre}`);
      console.log(`    Estudiante: ${p.estudiante_nombre || 'No asignado'}`);
    });

    // 5. Verificar la subconsulta EXISTS por separado
    console.log('\n5. Verificar subconsulta EXISTS:');
    const [existsResults] = await connection.execute(`
      SELECT p.id, p.titulo,
        EXISTS (
          SELECT 1 FROM proyecto_usuarios pu 
          WHERE pu.proyecto_id = p.id 
            AND pu.usuario_id = ? 
            AND pu.rol = 'coordinador' 
            AND pu.estado = 'activo'
        ) as es_coordinador
      FROM proyectos p
    `, [directorId]);
    
    console.log('Verificación EXISTS por proyecto:');
    existsResults.forEach(p => {
      console.log(`  - Proyecto ID: ${p.id}, Título: ${p.titulo}, Es coordinador: ${p.es_coordinador ? 'SÍ' : 'NO'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

testDirector35();