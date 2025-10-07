const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');

async function testDirectorLogin() {
  let connection;
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    console.log('🔍 Probando login de Director...\n');

    // Buscar un usuario Director
    const [directors] = await connection.execute(`
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Director de Proyecto' AND u.activo = 1
      LIMIT 1
    `);

    if (directors.length === 0) {
      console.log('❌ No se encontró ningún Director activo');
      return;
    }

    const director = directors[0];
    console.log('👤 Director encontrado:');
    console.log(`   - ID: ${director.id}`);
    console.log(`   - Nombre: ${director.nombres} ${director.apellidos}`);
    console.log(`   - Email: ${director.email}`);
    console.log(`   - Rol: ${director.rol_nombre}`);
    console.log(`   - Rol ID: ${director.rol_id}`);
    console.log(`   - Activo: ${director.activo}`);

    // Verificar información del rol
    const [roleInfo] = await connection.execute(`
      SELECT * FROM roles WHERE id = ?
    `, [director.rol_id]);

    if (roleInfo.length > 0) {
      console.log('\n📋 Información del rol:');
      console.log(`   - ID: ${roleInfo[0].id}`);
      console.log(`   - Nombre: "${roleInfo[0].nombre}"`);
      console.log(`   - Activo: ${roleInfo[0].activo}`);
      console.log(`   - Permisos: ${roleInfo[0].permisos || 'null'}`);
    }

    // Simular datos de sesión que se crearían en login
    console.log('\n🔐 Datos de sesión que se crearían:');
    
    let permisos = [];
    try {
      if (roleInfo[0]?.permisos) {
        if (typeof roleInfo[0].permisos === 'string') {
          permisos = JSON.parse(roleInfo[0].permisos);
        } else {
          permisos = roleInfo[0].permisos;
        }
      }
    } catch (e) {
      console.log('   ⚠️  Error parseando permisos:', e.message);
      permisos = [];
    }
    
    const sessionData = {
      id: director.id,
      codigo_usuario: director.codigo_usuario,
      email: director.email,
      nombres: director.nombres,
      apellidos: director.apellidos,
      rol_id: director.rol_id,
      rol_nombre: director.rol_nombre,
      permisos: permisos,
      area_trabajo_id: director.area_trabajo_id
    };

    console.log(JSON.stringify(sessionData, null, 2));

    // Verificar si el rol está en la lista permitida
    const allowedRoles = ['Coordinador Académico', 'Administrador General', 'Director de Proyecto'];
    const hasPermission = allowedRoles.includes(director.rol_nombre);
    
    console.log('\n✅ Verificación de permisos:');
    console.log(`   - Roles permitidos: ${allowedRoles.join(', ')}`);
    console.log(`   - Rol del usuario: "${director.rol_nombre}"`);
    console.log(`   - ¿Tiene permiso?: ${hasPermission ? '✅ SÍ' : '❌ NO'}`);

    if (hasPermission) {
      console.log('\n🎉 El Director DEBERÍA poder crear proyectos según la configuración actual');
    } else {
      console.log('\n⚠️  El Director NO puede crear proyectos según la configuración actual');
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

testDirectorLogin();