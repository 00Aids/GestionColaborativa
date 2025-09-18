const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkAreasTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_proyectos'
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // Verificar estructura de areas_trabajo
    console.log('\n📋 Estructura de areas_trabajo:');
    const [columns] = await connection.execute('DESCRIBE areas_trabajo');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type}`);
    });
    
    // Verificar datos existentes
    console.log('\n📊 Datos en areas_trabajo:');
    const [areas] = await connection.execute('SELECT * FROM areas_trabajo LIMIT 5');
    areas.forEach(area => {
      console.log(`  - ID: ${area.id}, Código: ${area.codigo}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAreasTable();