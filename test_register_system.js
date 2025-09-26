const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function testRegisterSystem() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'gestion_academica'
    });

    console.log('🚀 Probando sistema de registro...\n');

    // 1. Verificar estructura de la tabla usuarios
    console.log('📋 Verificando estructura de la tabla usuarios...');
    const [userTableStructure] = await connection.execute('DESCRIBE usuarios');
    
    console.log('Campos de la tabla usuarios:');
    userTableStructure.forEach(column => {
      console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
    });

    // 2. Verificar tabla roles
    console.log('\n📋 Verificando tabla roles...');
    const [rolesTable] = await connection.execute("SHOW TABLES LIKE 'roles'");
    
    if (rolesTable.length > 0) {
      const [roles] = await connection.execute('SELECT * FROM roles');
      console.log('Roles disponibles:');
      roles.forEach(role => {
        console.log(`   - ID: ${role.id}, Nombre: ${role.nombre}`);
      });
    } else {
      console.log('❌ Tabla roles no existe');
    }

    // 3. Verificar tabla areas_trabajo
    console.log('\n📋 Verificando tabla areas_trabajo...');
    const [areasTable] = await connection.execute("SHOW TABLES LIKE 'areas_trabajo'");
    
    if (areasTable.length > 0) {
      const [areas] = await connection.execute('SELECT COUNT(*) as count FROM areas_trabajo');
      console.log(`Áreas de trabajo existentes: ${areas[0].count}`);
    } else {
      console.log('❌ Tabla areas_trabajo no existe');
    }

    // 4. Probar creación de usuario de prueba
    console.log('\n🧪 Probando creación de usuario...');
    
    const testUser = {
      codigo_usuario: 'TEST001',
      nombres: 'Usuario',
      apellidos: 'Prueba',
      email: 'test@example.com',
      password_hash: await bcrypt.hash('123456', 10),
      rol_id: 5, // Estudiante
      activo: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Verificar si el usuario ya existe
    const [existingUser] = await connection.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [testUser.email]
    );

    if (existingUser.length > 0) {
      console.log('ℹ️ Usuario de prueba ya existe, eliminándolo...');
      await connection.execute('DELETE FROM usuarios WHERE email = ?', [testUser.email]);
    }

    // Intentar crear el usuario
    try {
      const [result] = await connection.execute(
        `INSERT INTO usuarios (codigo_usuario, nombres, apellidos, email, password_hash, rol_id, activo, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          testUser.codigo_usuario,
          testUser.nombres,
          testUser.apellidos,
          testUser.email,
          testUser.password_hash,
          testUser.rol_id,
          testUser.activo,
          testUser.created_at,
          testUser.updated_at
        ]
      );

      console.log('✅ Usuario de prueba creado exitosamente');
      console.log(`   - ID: ${result.insertId}`);
      console.log(`   - Email: ${testUser.email}`);
      console.log(`   - Código: ${testUser.codigo_usuario}`);

      // 5. Probar autenticación
      console.log('\n🔐 Probando autenticación...');
      const [authUser] = await connection.execute(
        'SELECT * FROM usuarios WHERE email = ? AND activo = true',
        [testUser.email]
      );

      if (authUser.length > 0) {
        const user = authUser[0];
        const isValidPassword = await bcrypt.compare('123456', user.password_hash);
        
        console.log(`✅ Usuario encontrado: ${user.email}`);
        console.log(`🔑 Contraseña válida: ${isValidPassword ? 'Sí' : 'No'}`);
      }

      // Limpiar usuario de prueba
      await connection.execute('DELETE FROM usuarios WHERE email = ?', [testUser.email]);
      console.log('🧹 Usuario de prueba eliminado');

    } catch (error) {
      console.error('❌ Error creando usuario de prueba:', error.message);
      
      // Verificar errores específicos
      if (error.code === 'ER_NO_SUCH_TABLE') {
        console.log('💡 La tabla usuarios no existe');
      } else if (error.code === 'ER_BAD_FIELD_ERROR') {
        console.log('💡 Hay un problema con los campos de la tabla');
      } else if (error.code === 'ER_NO_REFERENCED_ROW_2') {
        console.log('💡 El rol_id especificado no existe en la tabla roles');
      }
    }

    // 6. Verificar usuarios existentes
    console.log('\n👥 Usuarios existentes en el sistema:');
    const [users] = await connection.execute(
      `SELECT u.id, u.codigo_usuario, u.nombres, u.apellidos, u.email, u.activo, r.nombre as rol_nombre
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id 
       ORDER BY u.created_at DESC 
       LIMIT 5`
    );

    if (users.length === 0) {
      console.log('   - No hay usuarios registrados');
    } else {
      users.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nombres} ${user.apellidos} (${user.email}) - ${user.rol_nombre || 'Sin rol'} - ${user.activo ? 'Activo' : 'Inactivo'}`);
      });
    }

    console.log('\n🎯 DIAGNÓSTICO DEL SISTEMA DE REGISTRO:');
    
    // Verificar problemas comunes
    const issues = [];
    
    if (rolesTable.length === 0) {
      issues.push('❌ Tabla roles no existe');
    }
    
    if (areasTable.length === 0) {
      issues.push('❌ Tabla areas_trabajo no existe');
    }

    if (issues.length === 0) {
      console.log('✅ El sistema de registro parece estar funcionando correctamente');
    } else {
      console.log('⚠️ Problemas encontrados:');
      issues.forEach(issue => console.log(`   ${issue}`));
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testRegisterSystem();