const mysql = require('mysql2/promise');

async function checkDirectorRoles() {
  let connection;
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    console.log('🔍 Verificando roles en la base de datos...\n');

    // Obtener todos los roles
    const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
    console.log('📋 Roles disponibles:');
    roles.forEach(role => {
      console.log(`  - ID: ${role.id}, Nombre: "${role.nombre}", Activo: ${role.activo}`);
    });

    console.log('\n🔍 Buscando usuarios con rol Director...\n');

    // Buscar usuarios con rol Director
    const [directors] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre LIKE '%Director%'
      ORDER BY u.id
    `);

    if (directors.length > 0) {
      console.log('👥 Usuarios con rol Director:');
      directors.forEach(director => {
        console.log(`  - ID: ${director.id}, Nombre: ${director.nombres} ${director.apellidos}, Email: ${director.email}, Rol: "${director.rol_nombre}"`);
      });
    } else {
      console.log('❌ No se encontraron usuarios con rol Director');
    }

    console.log('\n🔍 Verificando permisos de creación de proyectos...\n');

    // Verificar si existe tabla de permisos
    const [tables] = await connection.execute("SHOW TABLES LIKE 'permisos'");
    if (tables.length > 0) {
      console.log('✅ Tabla de permisos encontrada');
      const [permissions] = await connection.execute('SELECT * FROM permisos');
      console.log('📋 Permisos disponibles:');
      permissions.forEach(perm => {
        console.log(`  - ${perm.nombre}: ${perm.descripcion}`);
      });
    } else {
      console.log('❌ No se encontró tabla de permisos - Los permisos se manejan por rol directamente');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Cargar variables de entorno
require('dotenv').config();

checkDirectorRoles();