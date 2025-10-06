const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDeliverable8() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== VERIFICANDO ENTREGABLE ID 8 ===\n');

        // Verificar si existe el entregable ID 8
        const [deliverable] = await connection.execute(
            'SELECT * FROM entregables WHERE id = ?',
            [8]
        );

        if (deliverable.length === 0) {
            console.log('❌ No existe el entregable con ID 8');
            return;
        }

        console.log('✅ Entregable ID 8 encontrado:');
        console.log('Título:', deliverable[0].titulo);
        console.log('Descripción:', deliverable[0].descripcion);
        console.log('Archivo URL:', deliverable[0].archivo_url);
        console.log('Fecha límite:', deliverable[0].fecha_limite);
        console.log('Estado:', deliverable[0].estado);
        console.log('Fase ID:', deliverable[0].fase_id);
        console.log('\n');

        // Verificar si tiene archivos adjuntos
        if (deliverable[0].archivo_url) {
            console.log('✅ El entregable tiene archivos adjuntos:');
            const files = deliverable[0].archivo_url.split(',');
            files.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file.trim()}`);
            });
        } else {
            console.log('❌ El entregable NO tiene archivos adjuntos (archivo_url es NULL o vacío)');
        }

        console.log('\n=== VERIFICANDO DATOS RELACIONADOS ===\n');

        // Verificar la fase asociada
        if (deliverable[0].fase_id) {
            const [fase] = await connection.execute(
                'SELECT * FROM fases_proyecto WHERE id = ?',
                [deliverable[0].fase_id]
            );
            
            if (fase.length > 0) {
                console.log('✅ Fase asociada encontrada:');
                console.log('Nombre fase:', fase[0].nombre);
                console.log('Proyecto ID:', fase[0].proyecto_id);
            }
        }

        // Verificar si hay entregas de estudiantes para este entregable
        const [submissions] = await connection.execute(
            'SELECT COUNT(*) as total FROM entregas WHERE entregable_id = ?',
            [8]
        );
        
        console.log(`📝 Entregas de estudiantes: ${submissions[0].total}`);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkDeliverable8();