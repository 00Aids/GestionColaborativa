const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDeliverableAttachments() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('🔍 Verificando archivos adjuntos en entregables...\n');

        // Consultar entregables con archivos adjuntos
        const [entregables] = await connection.execute(`
            SELECT 
                id,
                titulo,
                archivo_url,
                estado,
                proyecto_id,
                created_at
            FROM entregables 
            WHERE archivo_url IS NOT NULL 
            AND archivo_url != ''
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log(`📋 Encontrados ${entregables.length} entregables con archivos adjuntos:\n`);

        if (entregables.length > 0) {
            entregables.forEach((entregable, index) => {
                console.log(`${index + 1}. ID: ${entregable.id}`);
                console.log(`   Título: ${entregable.titulo}`);
                console.log(`   Estado: ${entregable.estado}`);
                console.log(`   Proyecto ID: ${entregable.proyecto_id}`);
                console.log(`   Archivo URL: ${entregable.archivo_url}`);
                console.log(`   Creado: ${entregable.created_at}`);
                console.log('');
            });
        } else {
            console.log('❌ No se encontraron entregables con archivos adjuntos');
        }

        // Verificar todos los entregables (con y sin archivos)
        const [allEntregables] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN archivo_url IS NOT NULL AND archivo_url != '' THEN 1 END) as con_archivos,
                COUNT(CASE WHEN archivo_url IS NULL OR archivo_url = '' THEN 1 END) as sin_archivos
            FROM entregables
        `);

        console.log('📊 Estadísticas generales:');
        console.log(`   Total entregables: ${allEntregables[0].total}`);
        console.log(`   Con archivos: ${allEntregables[0].con_archivos}`);
        console.log(`   Sin archivos: ${allEntregables[0].sin_archivos}`);

        // Verificar estructura de la tabla
        console.log('\n🏗️  Estructura de la columna archivo_url:');
        const [columns] = await connection.execute(`
            DESCRIBE entregables archivo_url
        `);
        
        if (columns.length > 0) {
            console.log(`   Tipo: ${columns[0].Type}`);
            console.log(`   Null: ${columns[0].Null}`);
            console.log(`   Default: ${columns[0].Default}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDeliverableAttachments();