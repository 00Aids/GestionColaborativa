const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function moveAttachmentFiles() {
    console.log('🔄 Moviendo archivos adjuntos de comments a deliverables...');
    
    let connection;
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        console.log('✅ Conexión a la base de datos establecida');

        // Buscar tareas con archivos adjuntos
        const [tasksWithAttachments] = await connection.execute(`
            SELECT id, titulo, observaciones
            FROM entregables 
            WHERE observaciones IS NOT NULL 
            AND JSON_VALID(observaciones) = 1
            AND JSON_EXTRACT(observaciones, '$.archivos_adjuntos') IS NOT NULL
            ORDER BY created_at DESC
        `);

        console.log(`\n📋 Encontradas ${tasksWithAttachments.length} tarea(s) con archivos adjuntos`);

        const commentsDir = path.join(__dirname, 'public', 'uploads', 'comments');
        const deliverablesDir = path.join(__dirname, 'public', 'uploads', 'deliverables');

        // Asegurar que el directorio deliverables existe
        if (!fs.existsSync(deliverablesDir)) {
            fs.mkdirSync(deliverablesDir, { recursive: true });
            console.log('✅ Directorio deliverables creado');
        }

        let movedCount = 0;
        let errorCount = 0;

        for (const task of tasksWithAttachments) {
            try {
                const obs = JSON.parse(task.observaciones);
                
                if (obs.archivos_adjuntos && obs.archivos_adjuntos.length > 0) {
                    console.log(`\n📋 Procesando tarea: ${task.titulo} (ID: ${task.id})`);
                    
                    for (const archivo of obs.archivos_adjuntos) {
                        const sourceFile = path.join(commentsDir, archivo.nombre_archivo);
                        const targetFile = path.join(deliverablesDir, archivo.nombre_archivo);
                        
                        console.log(`   📁 Archivo: ${archivo.nombre_original} -> ${archivo.nombre_archivo}`);
                        
                        // Verificar si el archivo existe en comments
                        if (fs.existsSync(sourceFile)) {
                            // Verificar si ya existe en deliverables
                            if (fs.existsSync(targetFile)) {
                                console.log(`      ℹ️  Ya existe en deliverables, eliminando de comments`);
                                fs.unlinkSync(sourceFile);
                            } else {
                                // Mover el archivo
                                fs.renameSync(sourceFile, targetFile);
                                console.log(`      ✅ Movido de comments a deliverables`);
                                movedCount++;
                            }
                        } else {
                            // Verificar si ya está en deliverables
                            if (fs.existsSync(targetFile)) {
                                console.log(`      ✅ Ya está en deliverables`);
                            } else {
                                console.log(`      ❌ Archivo no encontrado en ningún directorio`);
                                errorCount++;
                            }
                        }
                    }
                }
            } catch (e) {
                console.log(`   ❌ Error al procesar tarea ${task.id}: ${e.message}`);
                errorCount++;
            }
        }

        console.log(`\n📊 Resumen:`);
        console.log(`   - Archivos movidos: ${movedCount}`);
        console.log(`   - Errores: ${errorCount}`);
        console.log(`   - Tareas procesadas: ${tasksWithAttachments.length}`);

        // Verificar el estado final
        console.log(`\n🔍 Verificación final:`);
        
        for (const task of tasksWithAttachments) {
            try {
                const obs = JSON.parse(task.observaciones);
                
                if (obs.archivos_adjuntos && obs.archivos_adjuntos.length > 0) {
                    console.log(`\n   📋 ${task.titulo}:`);
                    
                    for (const archivo of obs.archivos_adjuntos) {
                        const targetFile = path.join(deliverablesDir, archivo.nombre_archivo);
                        const exists = fs.existsSync(targetFile);
                        console.log(`      ${archivo.nombre_original}: ${exists ? '✅' : '❌'}`);
                    }
                }
            } catch (e) {
                console.log(`   ❌ Error al verificar tarea ${task.id}: ${e.message}`);
            }
        }

        console.log('\n🎉 ¡Proceso completado!');

    } catch (error) {
        console.error('❌ Error durante el proceso:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

moveAttachmentFiles();