const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkProyectoUsuariosTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_academica'
        });
        
        console.log('✅ Conectado a la base de datos');
        
        // Verificar estructura de la tabla proyecto_usuarios
        const [columns] = await connection.execute('DESCRIBE proyecto_usuarios');
        
        console.log('\n📋 Estructura de la tabla proyecto_usuarios:');
        columns.forEach(col => {
            console.log(`   ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}) ${col.Key ? `[${col.Key}]` : ''}`);
        });
        
        // Verificar algunos datos de ejemplo
        const [data] = await connection.execute('SELECT * FROM proyecto_usuarios LIMIT 3');
        console.log(`\n📊 Datos de ejemplo (${data.length} registros):`);
        data.forEach((row, index) => {
            console.log(`   Registro ${index + 1}:`, row);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkProyectoUsuariosTable();