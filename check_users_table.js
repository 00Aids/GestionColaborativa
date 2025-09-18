const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsersTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_proyectos'
  });
  
  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME, DATA_TYPE 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'usuarios'
    ORDER BY ORDINAL_POSITION
  `, [process.env.DB_NAME]);
  
  console.log('Columnas en usuarios:');
  columns.forEach(col => {
    console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
  });
  
  await connection.end();
}

checkUsersTable().catch(console.error);