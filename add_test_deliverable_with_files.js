const mysql = require('mysql2/promise');
require('dotenv').config();

async function addTestDeliverableWithFiles() {
    let connection;
    
    try {
        // Crear conexión a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        console.log('🔧 Agregando entregable de prueba con archivos adjuntos...\n');

        // Primero, obtener un proyecto existente
        const [projects] = await connection.execute(`
            SELECT id, titulo FROM proyectos LIMIT 1
        `);

        if (projects.length === 0) {
            console.log('❌ No se encontraron proyectos. Necesitas crear un proyecto primero.');
            return;
        }

        const project = projects[0];
        console.log(`📁 Usando proyecto: ${project.titulo} (ID: ${project.id})`);

        // URLs de archivos de ejemplo (simulando archivos subidos por el admin)
        const testFiles = [
            '/uploads/deliverables/ejemplo_documento.pdf',
            '/uploads/deliverables/plantilla_entregable.docx',
            '/uploads/deliverables/recursos_adicionales.zip'
        ];

        const archivo_url = testFiles.join(',');

        // Obtener una fase disponible
        const [phases] = await connection.execute(`
            SELECT id FROM fases_proyecto LIMIT 1
        `);

        let fase_id = 1; // valor por defecto
        if (phases.length > 0) {
            fase_id = phases[0].id;
        }

        // Crear entregable con archivos adjuntos
        const [result] = await connection.execute(`
            INSERT INTO entregables (
                titulo,
                descripcion,
                archivo_url,
                fecha_limite,
                estado,
                proyecto_id,
                fase_id,
                created_at,
                updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `, [
            'Entregable de Prueba con Archivos',
            'Este es un entregable de prueba que incluye archivos adjuntos subidos por el administrador. Los estudiantes deben revisar los archivos adjuntos para completar esta tarea.',
            archivo_url,
            '2024-12-31 23:59:59',
            'pendiente',
            project.id,
            fase_id
        ]);

        console.log(`✅ Entregable creado con ID: ${result.insertId}`);
        console.log(`📎 Archivos adjuntos agregados:`);
        testFiles.forEach((file, index) => {
            console.log(`   ${index + 1}. ${file}`);
        });

        // Verificar que se creó correctamente
        const [verification] = await connection.execute(`
            SELECT 
                id,
                titulo,
                archivo_url,
                estado,
                proyecto_id,
                created_at
            FROM entregables 
            WHERE id = ?
        `, [result.insertId]);

        if (verification.length > 0) {
            const deliverable = verification[0];
            console.log('\n🔍 Verificación del entregable creado:');
            console.log(`   ID: ${deliverable.id}`);
            console.log(`   Título: ${deliverable.titulo}`);
            console.log(`   Estado: ${deliverable.estado}`);
            console.log(`   Proyecto ID: ${deliverable.proyecto_id}`);
            console.log(`   Archivos: ${deliverable.archivo_url}`);
            console.log(`   Creado: ${deliverable.created_at}`);
            
            console.log('\n🎯 Ahora puedes probar la vista detallada en:');
            console.log(`   http://localhost:3000/student/deliverables/${deliverable.id}`);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

addTestDeliverableWithFiles();