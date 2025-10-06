const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function debugFileMismatch() {
    console.log('🔍 Investigando discrepancia entre archivos en BD y archivos físicos...');
    
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

        // Obtener archivos de la base de datos
        console.log('\n📋 Archivos en la base de datos:');
        const [tasksWithAttachments] = await connection.execute(`
            SELECT id, titulo, observaciones,
                   JSON_EXTRACT(observaciones, '$.archivos_adjuntos') as archivos_json
            FROM entregables 
            WHERE observaciones IS NOT NULL 
            AND JSON_VALID(observaciones) = 1
            AND JSON_EXTRACT(observaciones, '$.archivos_adjuntos') IS NOT NULL
            ORDER BY created_at DESC
        `);

        const dbFiles = [];
        for (const task of tasksWithAttachments) {
            try {
                const archivos = JSON.parse(task.archivos_json);
                console.log(`\n   Tarea: ${task.titulo} (ID: ${task.id})`);
                archivos.forEach((archivo, index) => {
                    console.log(`     ${index + 1}. ${archivo.nombre_original} -> ${archivo.nombre_archivo}`);
                    dbFiles.push({
                        taskId: task.id,
                        taskTitle: task.titulo,
                        originalName: archivo.nombre_original,
                        fileName: archivo.nombre_archivo,
                        mimeType: archivo.tipo_mime
                    });
                });
            } catch (e) {
                console.log(`   ❌ Error al parsear archivos de tarea ${task.id}: ${e.message}`);
            }
        }

        // Obtener archivos físicos
        console.log('\n📁 Archivos físicos en /public/uploads/deliverables/:');
        const deliverablesDir = path.join(__dirname, 'public', 'uploads', 'deliverables');
        const physicalFiles = [];
        
        if (fs.existsSync(deliverablesDir)) {
            const files = fs.readdirSync(deliverablesDir);
            files.forEach((file, index) => {
                console.log(`   ${index + 1}. ${file}`);
                physicalFiles.push(file);
            });
        } else {
            console.log('   ❌ El directorio /public/uploads/deliverables/ no existe');
        }

        // Obtener archivos físicos en comments (por si acaso)
        console.log('\n📁 Archivos físicos en /public/uploads/comments/:');
        const commentsDir = path.join(__dirname, 'public', 'uploads', 'comments');
        const commentFiles = [];
        
        if (fs.existsSync(commentsDir)) {
            const files = fs.readdirSync(commentsDir);
            files.forEach((file, index) => {
                console.log(`   ${index + 1}. ${file}`);
                commentFiles.push(file);
            });
        }

        // Comparar archivos
        console.log('\n🔍 Análisis de coincidencias:');
        
        for (const dbFile of dbFiles) {
            const foundInDeliverables = physicalFiles.includes(dbFile.fileName);
            const foundInComments = commentFiles.includes(dbFile.fileName);
            
            console.log(`\n   📋 BD: ${dbFile.fileName} (${dbFile.originalName})`);
            console.log(`      Tarea: ${dbFile.taskTitle} (ID: ${dbFile.taskId})`);
            console.log(`      En deliverables: ${foundInDeliverables ? '✅' : '❌'}`);
            console.log(`      En comments: ${foundInComments ? '✅' : '❌'}`);
            
            if (!foundInDeliverables && !foundInComments) {
                console.log(`      ⚠️  ARCHIVO NO ENCONTRADO EN NINGÚN DIRECTORIO`);
            } else if (!foundInDeliverables && foundInComments) {
                console.log(`      🔄 ARCHIVO ESTÁ EN COMMENTS, DEBERÍA ESTAR EN DELIVERABLES`);
            }
        }

        // Verificar archivos huérfanos
        console.log('\n🔍 Archivos huérfanos (físicos sin referencia en BD):');
        
        console.log('\n   En deliverables:');
        for (const physicalFile of physicalFiles) {
            const foundInDb = dbFiles.some(dbFile => dbFile.fileName === physicalFile);
            if (!foundInDb) {
                console.log(`     ❓ ${physicalFile} - No referenciado en BD`);
            }
        }
        
        console.log('\n   En comments:');
        for (const commentFile of commentFiles) {
            const foundInDb = dbFiles.some(dbFile => dbFile.fileName === commentFile);
            if (!foundInDb) {
                console.log(`     ❓ ${commentFile} - No referenciado en BD`);
            }
        }

        console.log('\n📊 Resumen:');
        console.log(`   - Archivos en BD: ${dbFiles.length}`);
        console.log(`   - Archivos físicos en deliverables: ${physicalFiles.length}`);
        console.log(`   - Archivos físicos en comments: ${commentFiles.length}`);

    } catch (error) {
        console.error('❌ Error durante el análisis:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugFileMismatch();