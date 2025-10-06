const mysql = require('mysql2/promise');
require('dotenv').config();

async function addFilesToDeliverable8() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== AGREGANDO ARCHIVOS AL ENTREGABLE ID 8 ===\n');

        // Archivos de ejemplo para agregar
        const sampleFiles = [
            '/uploads/deliverables/maxwell.jpg',
            '/uploads/deliverables/instrucciones_tareita.pdf',
            '/uploads/deliverables/recursos_tareita.zip'
        ];

        const filesString = sampleFiles.join(',');

        // Actualizar el entregable con archivos adjuntos
        const [result] = await connection.execute(
            'UPDATE entregables SET archivo_url = ? WHERE id = ?',
            [filesString, 8]
        );

        if (result.affectedRows > 0) {
            console.log('✅ Archivos agregados exitosamente al entregable ID 8');
            console.log('Archivos agregados:');
            sampleFiles.forEach((file, index) => {
                console.log(`  ${index + 1}. ${file}`);
            });
            
            console.log('\n📍 Ahora puedes probar la vista en:');
            console.log('   http://localhost:3000/student/deliverables/8');
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

addFilesToDeliverable8();