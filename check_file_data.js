const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFileData() {
    let connection;
    try {
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('🔍 Verificando datos de archivos en entregables...\n');

        const [rows] = await connection.execute(`
            SELECT id, titulo, archivo_url, archivos_adjuntos 
            FROM entregables 
            WHERE (archivo_url IS NOT NULL AND archivo_url != '') 
               OR (archivos_adjuntos IS NOT NULL AND archivos_adjuntos != '')
            ORDER BY id DESC 
            LIMIT 5
        `);

        console.log('=== DATOS ACTUALES EN LA BASE DE DATOS ===');
        rows.forEach(row => {
            console.log(`ID: ${row.id}`);
            console.log(`Título: ${row.titulo}`);
            console.log(`archivo_url: ${row.archivo_url || 'NULL'}`);
            console.log(`archivos_adjuntos: ${row.archivos_adjuntos || 'NULL'}`);
            console.log('---');
        });

        // Verificar un entregable específico si existe
        const [specific] = await connection.execute(`
            SELECT * FROM entregables WHERE id = 8
        `);

        if (specific.length > 0) {
            console.log('\n=== ENTREGABLE ID 8 (DETALLE) ===');
            const entregable = specific[0];
            console.log(`Título: ${entregable.titulo}`);
            console.log(`archivo_url: ${entregable.archivo_url}`);
            console.log(`archivos_adjuntos: ${entregable.archivos_adjuntos}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkFileData();