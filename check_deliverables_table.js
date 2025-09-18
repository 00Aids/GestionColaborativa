const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDeliverablesTable() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_proyectos'
  });
  
  const [columns] = await connection.execute(`
    SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'entregables' 
    ORDER BY ORDINAL_POSITION
  `, [process.env.DB_NAME]);
  
  console.log('Columnas en entregables:');
  columns.forEach(col => {
    console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'} - Default: ${col.COLUMN_DEFAULT || 'None'}`);
  });
  
  await connection.end();
}

checkDeliverablesTable().catch(console.error);