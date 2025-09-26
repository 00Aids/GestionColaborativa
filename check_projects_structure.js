const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProjectsStructure() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });
    
    console.log('Estructura de la tabla proyectos:');
    const [result] = await connection.execute('DESCRIBE proyectos');
    result.forEach(col => {
      console.log(`- ${col.Field} (${col.Type})`);
    });
    
    console.log('\nPrimeros 3 proyectos:');
    const [projects] = await connection.execute('SELECT * FROM proyectos LIMIT 3');
    console.log(projects);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkProjectsStructure();