const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRoles() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    const [roles] = await connection.execute('SELECT * FROM roles');
    console.log('Roles disponibles:');
    roles.forEach(r => console.log(`ID: ${r.id}, Nombre: ${r.nombre}`));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkRoles();