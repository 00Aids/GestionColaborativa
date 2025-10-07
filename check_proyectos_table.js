require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkProyectosTable() {
    let connection;
    
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });
        
        console.log('🔍 Verificando estructura de la tabla proyectos...\n');
        console.log('✅ Conexión a la base de datos establecida\n');
        
        console.log('📋 Columnas de la tabla proyectos:');
        console.log('=====================================');
        const [rows] = await connection.execute('DESCRIBE proyectos');
        
        rows.forEach(row => {
            const nullable = row.Null === 'YES' ? 'NULL' : 'NOT NULL';
            const key = row.Key ? `- ${row.Key}` : '- No Key';
            const defaultVal = row.Default !== null ? `- DEFAULT ${row.Default}` : '';
            console.log(`- ${row.Field} (${row.Type}) - ${nullable} ${key} ${defaultVal}`);
        });
        
        console.log('\n📊 Datos de ejemplo:');
        console.log('====================');
        const [projects] = await connection.execute('SELECT * FROM proyectos LIMIT 3');
        
        console.log(`Se encontraron ${projects.length} proyectos de ejemplo:\n`);
        
        projects.forEach((project, index) => {
            console.log(`Proyecto ${index + 1}:`);
            Object.keys(project).forEach(key => {
                console.log(`  ${key}: ${project[key]}`);
            });
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

checkProyectosTable();