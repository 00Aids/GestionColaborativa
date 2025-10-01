const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsersStructure() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('📋 ESTRUCTURA DE LA TABLA USUARIOS:\n');
    
    const [result] = await connection.execute('DESCRIBE usuarios');
    result.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    console.log('\n🔍 BUSCANDO USUARIO ananim@gmail.com:\n');
    
    // Buscar el usuario con todos los campos disponibles
    const [userResult] = await connection.execute(`
      SELECT * FROM usuarios WHERE email = ?
    `, ['ananim@gmail.com']);

    if (userResult.length === 0) {
      console.log('❌ Usuario no encontrado');
    } else {
      const user = userResult[0];
      console.log('✅ Usuario encontrado:');
      Object.keys(user).forEach(key => {
        console.log(`${key}: ${user[key]}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await connection.end();
  }
}

checkUsersStructure();