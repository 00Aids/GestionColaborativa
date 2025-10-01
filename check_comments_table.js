const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkHistoryTables() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_academica'
        });

        console.log('✅ Conectado a la base de datos');

        // Buscar tablas de historial
        const [historyTables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%historial%'
        `, [process.env.DB_NAME || 'gestion_academica']);
        
        console.log('\n🔍 Tablas de historial encontradas:');
        if (historyTables.length > 0) {
            for (const table of historyTables) {
                console.log(`\n📋 Tabla: ${table.TABLE_NAME}`);
                
                // Mostrar estructura
                const [structure] = await connection.execute(`DESCRIBE ${table.TABLE_NAME}`);
                structure.forEach(column => {
                    console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
                });
            }
        } else {
            console.log('  No se encontraron tablas de historial');
        }

        // Buscar tablas que contengan "entregable" en el nombre
        const [entregableTables] = await connection.execute(`
            SELECT TABLE_NAME 
            FROM INFORMATION_SCHEMA.TABLES 
            WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%entregable%'
        `, [process.env.DB_NAME || 'gestion_academica']);
        
        console.log('\n🔍 Tablas relacionadas con entregables:');
        entregableTables.forEach(table => {
            console.log(`  - ${table.TABLE_NAME}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

checkHistoryTables();