const mysql = require('mysql2/promise');

async function debugFindByDirector() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
  });

  try {
    console.log('=== DEBUGGING findByDirector METHOD ===\n');

    // 1. Consulta directa simple
    console.log('1. Consulta directa simple:');
    const [simpleResults] = await connection.execute(
      'SELECT id, titulo, estado, director_id FROM proyectos WHERE director_id = ?',
      [1]
    );
    console.log(`Proyectos encontrados: ${simpleResults.length}`);
    simpleResults.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}`);
    });

    console.log('\n2. Consulta completa del método findByDirector (sin DISTINCT):');
    const queryWithoutDistinct = `
      SELECT 
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

    const [fullResults] = await connection.execute(queryWithoutDistinct, [1, 1]);
    console.log(`Proyectos encontrados (sin DISTINCT): ${fullResults.length}`);
    fullResults.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}`);
    });

    console.log('\n3. Consulta completa del método findByDirector (con DISTINCT):');
    const queryWithDistinct = `
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

    const [distinctResults] = await connection.execute(queryWithDistinct, [1, 1]);
    console.log(`Proyectos encontrados (con DISTINCT): ${distinctResults.length}`);
    distinctResults.forEach(p => {
      console.log(`  - ID: ${p.id}, Título: ${p.titulo}, Estado: ${p.estado}`);
    });

    console.log('\n4. Verificar tabla proyecto_usuarios:');
    const [puResults] = await connection.execute(
      'SELECT * FROM proyecto_usuarios WHERE usuario_id = ? AND rol = "coordinador" AND estado = "activo"',
      [1]
    );
    console.log(`Registros en proyecto_usuarios: ${puResults.length}`);
    puResults.forEach(pu => {
      console.log(`  - Proyecto ID: ${pu.proyecto_id}, Usuario ID: ${pu.usuario_id}, Rol: ${pu.rol}, Estado: ${pu.estado}`);
    });

    console.log('\n5. Verificar si hay duplicados por los JOINs:');
    const [joinCheck] = await connection.execute(`
      SELECT p.id, p.titulo, COUNT(*) as count
      FROM proyectos p
      LEFT JOIN usuarios u ON p.estudiante_id = u.id
      LEFT JOIN usuarios d ON p.director_id = d.id
      LEFT JOIN lineas_investigacion li ON p.linea_investigacion_id = li.id
      LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
      WHERE p.director_id = ?
      GROUP BY p.id, p.titulo
      HAVING COUNT(*) > 1
    `, [1]);
    
    console.log(`Proyectos con duplicados por JOINs: ${joinCheck.length}`);
    joinCheck.forEach(j => {
      console.log(`  - ID: ${j.id}, Título: ${j.titulo}, Count: ${j.count}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugFindByDirector();