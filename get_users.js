const mysql = require('mysql2/promise');
require('dotenv').config();

async function getUsers() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    const [users] = await connection.execute('SELECT id, nombres, email FROM usuarios LIMIT 3');
    
    console.log('Usuarios disponibles:');
    users.forEach(user => {
      console.log(`- ID: ${user.id}, Nombre: ${user.nombres}, Email: ${user.email}`);
    });

    await connection.end();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getUsers();