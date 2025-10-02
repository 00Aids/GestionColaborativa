require('dotenv').config();
const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'gestion_academica'
};

async function checkTables() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');
    
    // Mostrar todas las tablas
    console.log('\n=== TABLAS EN LA BASE DE DATOS ===');
    const [tables] = await connection.execute('SHOW TABLES');
    console.table(tables);
    
    // Verificar si existe tabla de usuarios (puede tener nombre diferente)
    const tableNames = tables.map(row => Object.values(row)[0]);
    console.log('\n📋 Nombres de tablas encontradas:');
    tableNames.forEach(name => console.log(`- ${name}`));
    
    // Buscar tabla que contenga usuarios
    const userTables = tableNames.filter(name => 
      name.toLowerCase().includes('user') || 
      name.toLowerCase().includes('usuario') ||
      name.toLowerCase().includes('admin')
    );
    
    if (userTables.length > 0) {
      console.log('\n👥 Tablas relacionadas con usuarios:');
      for (const tableName of userTables) {
        console.log(`\n--- Estructura de ${tableName} ---`);
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.table(columns);
        
        console.log(`\n--- Datos en ${tableName} ---`);
        const [data] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 10`);
        console.table(data);
      }
    } else {
      console.log('\n❌ No se encontraron tablas de usuarios');
    }
    
    // Buscar tabla que contenga áreas
    const areaTables = tableNames.filter(name => 
      name.toLowerCase().includes('area') || 
      name.toLowerCase().includes('trabajo')
    );
    
    if (areaTables.length > 0) {
      console.log('\n🏢 Tablas relacionadas con áreas:');
      for (const tableName of areaTables) {
        console.log(`\n--- Estructura de ${tableName} ---`);
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        console.table(columns);
        
        console.log(`\n--- Datos en ${tableName} ---`);
        const [data] = await connection.execute(`SELECT * FROM ${tableName} LIMIT 10`);
        console.table(data);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

checkTables();