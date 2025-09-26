const mysql = require('mysql2/promise');
require('dotenv').config();

async function testSimpleQuery() {
    console.log('🧪 Probando consulta simple a historial_area_trabajo...\n');

    try {
        // Crear conexión directa
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('✅ Conexión a la base de datos establecida\n');

        // Probar consulta simple sin parámetros
        console.log('1. Probando consulta básica...');
        const [rows1] = await connection.execute('SELECT COUNT(*) as total FROM historial_area_trabajo');
        console.log(`✅ Total de registros en historial: ${rows1[0].total}\n`);

        // Probar consulta con un parámetro
        console.log('2. Probando consulta con un parámetro...');
        const [rows2] = await connection.execute(
            'SELECT * FROM historial_area_trabajo WHERE area_trabajo_id = ? LIMIT 5',
            [1]
        );
        console.log(`✅ Registros encontrados para área 1: ${rows2.length}\n`);

        // Probar consulta con LIMIT y OFFSET
        console.log('3. Probando consulta con LIMIT y OFFSET...');
        const [rows3] = await connection.execute(
            'SELECT * FROM historial_area_trabajo LIMIT 5 OFFSET 0'
        );
        console.log(`✅ Registros con LIMIT/OFFSET: ${rows3.length}\n`);

        // Probar la consulta completa
        console.log('4. Probando consulta completa...');
        const query = `
            SELECT 
                h.*,
                CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre,
                u.email as usuario_email
            FROM historial_area_trabajo h
            LEFT JOIN usuarios u ON h.usuario_id = u.id
            WHERE h.area_trabajo_id = ?
            ORDER BY h.created_at DESC
            LIMIT 5 OFFSET 0
        `;
        
        const [rows4] = await connection.execute(query, [1]);
        console.log(`✅ Consulta completa exitosa: ${rows4.length} registros\n`);

        if (rows4.length > 0) {
            console.log('📊 Primer registro encontrado:');
            console.log(`   - ID: ${rows4[0].id}`);
            console.log(`   - Acción: ${rows4[0].accion}`);
            console.log(`   - Descripción: ${rows4[0].descripcion}`);
            console.log(`   - Usuario: ${rows4[0].usuario_nombre || 'N/A'}\n`);
        }

        await connection.end();
        console.log('🎉 ¡Todas las pruebas de consulta completadas exitosamente!');

    } catch (error) {
        console.error('❌ Error durante las pruebas:', error);
        process.exit(1);
    }
}

// Ejecutar las pruebas
testSimpleQuery();