const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateDeliverable8Files() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== ACTUALIZANDO RUTAS DE ARCHIVOS ENTREGABLE ID 8 ===\n');

        // Nuevas rutas con extensiones correctas
        const correctedFiles = [
            '/uploads/deliverables/maxwell.svg',
            '/uploads/deliverables/instrucciones_tareita.svg',
            '/uploads/deliverables/recursos_tareita.svg'
        ];

        const filesString = correctedFiles.join(',');

        // Actualizar el entregable con las rutas corregidas
        const [result] = await connection.execute(
            'UPDATE entregables SET archivo_url = ? WHERE id = ?',
            [filesString, 8]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Rutas de archivos actualizadas exitosamente');
            console.log('Nuevas rutas:');
            correctedFiles.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file}`);
            });
        } else {
            console.log('❌ No se pudo actualizar el entregable');
        }

        // Verificar la actualización
        const [updated] = await connection.execute(
            'SELECT titulo, archivo_url FROM entregables WHERE id = ?',
            [8]
        );

        console.log('\n=== VERIFICACIÓN ===');
        console.log('Título:', updated[0].titulo);
        console.log('Archivos:', updated[0].archivo_url);

    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await connection.end();
    }
}

updateDeliverable8Files();