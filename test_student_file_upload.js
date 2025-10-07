const mysql = require('mysql2/promise');
require('dotenv').config();

async function testStudentFileUpload() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== SIMULANDO SUBIDA DE ARCHIVO DEL ESTUDIANTE ===\n');

        // Simular archivos del estudiante
        const testFiles = [{
            url: '/uploads/deliverables/student-submission-test.pdf',
            nombre: 'mi_tarea_completada.pdf',
            tipo: 'entregado'
        }];

        const filesJson = JSON.stringify(testFiles);

        // Actualizar el entregable con archivos del estudiante
        const [result] = await connection.execute(
            'UPDATE entregables SET archivos_adjuntos = ? WHERE id = ?',
            [filesJson, 8]
        );

        console.log('✅ Archivo del estudiante agregado a archivos_adjuntos');
        console.log('Datos guardados:', filesJson);

        // Verificar la actualización
        const [check] = await connection.execute(
            'SELECT id, titulo, archivo_url, archivos_adjuntos FROM entregables WHERE id = ?',
            [8]
        );

        console.log('\n📋 Verificación del entregable ID 8:');
        console.log('ID:', check[0].id);
        console.log('Título:', check[0].titulo);
        console.log('archivo_url (archivos originales):', check[0].archivo_url);
        console.log('archivos_adjuntos (archivos del estudiante):', check[0].archivos_adjuntos);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

testStudentFileUpload();