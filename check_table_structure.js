const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'proyecto_grado'
};

async function checkTableStructure() {
    let connection;
    
    try {
        console.log('🔍 Verificando estructura de la tabla entregables...\n');
        
        connection = await mysql.createConnection(dbConfig);
        console.log('✅ Conexión a la base de datos establecida\n');

        // Verificar estructura de la tabla entregables
        const [columns] = await connection.execute(`SHOW COLUMNS FROM entregables`);
        
        console.log('📋 Columnas de la tabla entregables:');
        console.log('=====================================');
        columns.forEach(col => {
            console.log(`- ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'} - ${col.Key ? col.Key : 'No Key'}`);
        });

        // Verificar algunas filas de ejemplo
        console.log('\n📊 Datos de ejemplo:');
        console.log('====================');
        const [rows] = await connection.execute(`SELECT * FROM entregables LIMIT 3`);
        
        if (rows.length > 0) {
            console.log(`Se encontraron ${rows.length} entregables de ejemplo:`);
            rows.forEach((row, index) => {
                console.log(`\nEntregable ${index + 1}:`);
                Object.keys(row).forEach(key => {
                    console.log(`  ${key}: ${row[key]}`);
                });
            });
        } else {
            console.log('No se encontraron entregables en la tabla');
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

checkTableStructure();