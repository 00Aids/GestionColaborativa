const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProjectsTable() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_proyectos'
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // Verificar estructura de la tabla proyectos
    const [columns] = await connection.execute(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT,
        COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'proyectos'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME || 'gestion_proyectos']);
    
    console.log('\n📋 Estructura de la tabla proyectos:');
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME}: ${col.COLUMN_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}) - Default: ${col.COLUMN_DEFAULT || 'NULL'}`);
    });
    
    // Verificar valores existentes de estado
    const [estados] = await connection.execute(`
      SELECT DISTINCT estado, COUNT(*) as count
      FROM proyectos
      GROUP BY estado
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Estados existentes en proyectos:');
    estados.forEach(estado => {
      console.log(`   ${estado.estado}: ${estado.count} proyectos`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

checkProjectsTable()
  .then(() => {
    console.log('\n✅ Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error:', error);
    process.exit(1);
  });