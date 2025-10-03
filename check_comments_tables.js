const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCommentsTables() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_academica'
    });
    
    console.log('Verificando tablas de comentarios...\n');
    
    // Buscar todas las tablas que contengan 'comentarios'
    const [tables] = await connection.execute("SHOW TABLES LIKE '%comentarios%'");
    console.log('Tablas de comentarios encontradas:');
    if (tables.length === 0) {
      console.log('- Ninguna tabla de comentarios encontrada');
    } else {
      tables.forEach(table => {
        console.log('- ' + Object.values(table)[0]);
      });
    }
    
    console.log('\n--- Verificando tabla específica proyecto_comentarios ---');
    try {
      const [result] = await connection.execute("DESCRIBE proyecto_comentarios");
      console.log('✅ La tabla proyecto_comentarios EXISTE');
      console.log('Estructura:');
      result.forEach(column => {
        console.log(`  - ${column.Field}: ${column.Type}`);
      });
    } catch (error) {
      console.log('❌ La tabla proyecto_comentarios NO EXISTE');
      console.log('Error:', error.message);
    }
    
    console.log('\n--- Verificando todas las tablas disponibles ---');
    const [allTables] = await connection.execute("SHOW TABLES");
    console.log('Total de tablas:', allTables.length);
    console.log('Tablas disponibles:');
    allTables.forEach(table => {
      console.log('- ' + Object.values(table)[0]);
    });
    
    await connection.end();
  } catch (error) {
    console.error('Error de conexión:', error.message);
  }
}

checkCommentsTables();