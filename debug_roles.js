const mysql = require('mysql2/promise');

async function debugRoles() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
  });

  try {
    console.log('=== DEBUGGING ROLES SYSTEM ===\n');

    // 1. Verificar todos los roles
    console.log('1. Todos los roles en el sistema:');
    const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
    console.log(`Roles encontrados: ${roles.length}`);
    roles.forEach(r => {
      console.log(`  - ID: ${r.id}, Nombre: ${r.nombre}, Descripción: ${r.descripcion}`);
    });

    // 2. Verificar usuarios por rol
    console.log('\n2. Usuarios por rol:');
    for (const role of roles) {
      const [users] = await connection.execute(`
        SELECT u.id, u.nombres, u.apellidos, u.email
        FROM usuarios u
        WHERE u.rol_id = ?
        ORDER BY u.id
      `, [role.id]);
      
      console.log(`  Rol "${role.nombre}" (ID: ${role.id}): ${users.length} usuarios`);
      users.forEach(u => {
        console.log(`    - ID: ${u.id}, Nombre: ${u.nombres} ${u.apellidos}, Email: ${u.email}`);
      });
    }

    // 3. Verificar qué usuario está logueado como director (simulando sesión)
    console.log('\n3. Verificar usuarios que podrían ser directores:');
    const [potentialDirectors] = await connection.execute(`
      SELECT DISTINCT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      WHERE pu.rol = 'coordinador' AND pu.estado = 'activo'
      ORDER BY u.id
    `);
    
    console.log(`Usuarios que actúan como coordinadores: ${potentialDirectors.length}`);
    potentialDirectors.forEach(u => {
      console.log(`  - ID: ${u.id}, Nombre: ${u.nombres} ${u.apellidos}, Rol en sistema: ${u.rol_nombre}`);
    });

    // 4. Verificar proyectos y sus relaciones
    console.log('\n4. Proyectos y sus coordinadores/directores:');
    const [projectRelations] = await connection.execute(`
      SELECT 
        p.id as proyecto_id,
        p.titulo,
        p.director_id,
        d.nombres as director_nombres,
        d.apellidos as director_apellidos,
        GROUP_CONCAT(
          CONCAT(u.nombres, ' ', u.apellidos, ' (', pu.rol, ')')
          SEPARATOR ', '
        ) as coordinadores
      FROM proyectos p
      LEFT JOIN usuarios d ON p.director_id = d.id
      LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id AND pu.estado = 'activo'
      LEFT JOIN usuarios u ON pu.usuario_id = u.id
      GROUP BY p.id, p.titulo, p.director_id, d.nombres, d.apellidos
      ORDER BY p.id
    `);
    
    console.log(`Relaciones de proyectos: ${projectRelations.length}`);
    projectRelations.forEach(pr => {
      console.log(`  Proyecto: ${pr.titulo} (ID: ${pr.proyecto_id})`);
      console.log(`    Director ID: ${pr.director_id} ${pr.director_nombres ? `(${pr.director_nombres} ${pr.director_apellidos})` : '(No asignado)'}`);
      console.log(`    Coordinadores: ${pr.coordinadores || 'Ninguno'}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugRoles();