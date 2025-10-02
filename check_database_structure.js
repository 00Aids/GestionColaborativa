const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDatabaseStructure() {
    console.log('=== VERIFICACIÓN DE ESTRUCTURA DE BASE DE DATOS ===\n');
    
    try {
        // Conexión a la base de datos
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'gestion_academica',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Conectado a la base de datos\n');
        
        // 1. Mostrar todas las tablas
        console.log('1. Listando todas las tablas en la base de datos:');
        const [tables] = await connection.execute('SHOW TABLES');
        
        if (tables.length === 0) {
            console.log('❌ No se encontraron tablas en la base de datos');
            await connection.end();
            return;
        }
        
        console.log(`✅ Encontradas ${tables.length} tabla(s):`);
        tables.forEach((table, index) => {
            const tableName = Object.values(table)[0];
            console.log(`   ${index + 1}. ${tableName}`);
        });
        
        // 2. Buscar tablas relacionadas con tareas
        console.log('\n2. Buscando tablas relacionadas con tareas:');
        const taskTables = tables.filter(table => {
            const tableName = Object.values(table)[0].toLowerCase();
            return tableName.includes('task') || tableName.includes('tarea') || tableName.includes('proyecto');
        });
        
        if (taskTables.length > 0) {
            console.log('✅ Tablas relacionadas con tareas encontradas:');
            taskTables.forEach((table, index) => {
                const tableName = Object.values(table)[0];
                console.log(`   ${index + 1}. ${tableName}`);
            });
            
            // 3. Describir la estructura de cada tabla relacionada con tareas
            console.log('\n3. Estructura de tablas relacionadas con tareas:');
            for (const table of taskTables) {
                const tableName = Object.values(table)[0];
                console.log(`\n--- Tabla: ${tableName} ---`);
                
                try {
                    const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
                    columns.forEach(column => {
                        console.log(`   ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
                    });
                } catch (error) {
                    console.log(`   ❌ Error describiendo tabla: ${error.message}`);
                }
            }
        } else {
            console.log('❌ No se encontraron tablas relacionadas con tareas');
        }
        
        // 4. Buscar tablas relacionadas con archivos
        console.log('\n4. Buscando tablas relacionadas con archivos:');
        const fileTables = tables.filter(table => {
            const tableName = Object.values(table)[0].toLowerCase();
            return tableName.includes('file') || tableName.includes('archivo') || tableName.includes('attachment') || tableName.includes('adjunto') || tableName.includes('upload');
        });
        
        if (fileTables.length > 0) {
            console.log('✅ Tablas relacionadas con archivos encontradas:');
            fileTables.forEach((table, index) => {
                const tableName = Object.values(table)[0];
                console.log(`   ${index + 1}. ${tableName}`);
            });
            
            // Describir estructura de tablas de archivos
            console.log('\n5. Estructura de tablas relacionadas con archivos:');
            for (const table of fileTables) {
                const tableName = Object.values(table)[0];
                console.log(`\n--- Tabla: ${tableName} ---`);
                
                try {
                    const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
                    columns.forEach(column => {
                        console.log(`   ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
                    });
                } catch (error) {
                    console.log(`   ❌ Error describiendo tabla: ${error.message}`);
                }
            }
        } else {
            console.log('❌ No se encontraron tablas relacionadas con archivos');
        }
        
        await connection.end();
        console.log('\n✅ Verificación de estructura completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkDatabaseStructure();