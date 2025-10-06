const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function debugSpecificTasks() {
    console.log('🔍 Investigando tareas específicas con archivos adjuntos...');
    
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

        // Buscar las tareas específicas que sabemos que tienen archivos
        console.log('\n📋 Buscando tareas "tarea1" y "tarea2":');
        const [specificTasks] = await connection.execute(`
            SELECT id, titulo, observaciones
            FROM entregables 
            WHERE titulo IN ('tarea1', 'tarea2')
            ORDER BY id DESC
        `);

        if (specificTasks.length === 0) {
            console.log('❌ No se encontraron las tareas específicas');
            
            // Buscar cualquier tarea reciente
            const [recentTasks] = await connection.execute(`
                SELECT id, titulo, observaciones, created_at
                FROM entregables 
                ORDER BY created_at DESC
                LIMIT 5
            `);
            
            console.log('\n📋 Tareas más recientes:');
            for (const task of recentTasks) {
                console.log(`   ID: ${task.id}, Título: ${task.titulo}`);
                console.log(`   Observaciones: ${task.observaciones ? 'Sí' : 'No'}`);
                if (task.observaciones) {
                    try {
                        const obs = JSON.parse(task.observaciones);
                        console.log(`   Archivos adjuntos: ${obs.archivos_adjuntos ? obs.archivos_adjuntos.length : 0}`);
                        if (obs.archivos_adjuntos && obs.archivos_adjuntos.length > 0) {
                            obs.archivos_adjuntos.forEach((archivo, index) => {
                                console.log(`     ${index + 1}. ${archivo.nombre_original} -> ${archivo.nombre_archivo}`);
                            });
                        }
                    } catch (e) {
                        console.log(`   ❌ Error al parsear observaciones: ${e.message}`);
                        console.log(`   Contenido raw: ${task.observaciones.substring(0, 100)}...`);
                    }
                }
                console.log('');
            }
        } else {
            console.log(`✅ Encontradas ${specificTasks.length} tarea(s):`);
            
            for (const task of specificTasks) {
                console.log(`\n📋 Tarea: ${task.titulo} (ID: ${task.id})`);
                console.log(`   Observaciones: ${task.observaciones ? 'Sí' : 'No'}`);
                
                if (task.observaciones) {
                    try {
                        const obs = JSON.parse(task.observaciones);
                        console.log(`   Archivos adjuntos: ${obs.archivos_adjuntos ? obs.archivos_adjuntos.length : 0}`);
                        
                        if (obs.archivos_adjuntos && obs.archivos_adjuntos.length > 0) {
                            obs.archivos_adjuntos.forEach((archivo, index) => {
                                console.log(`     ${index + 1}. ${archivo.nombre_original} -> ${archivo.nombre_archivo}`);
                                
                                // Verificar si el archivo existe físicamente
                                const deliverablesPath = path.join(__dirname, 'public', 'uploads', 'deliverables', archivo.nombre_archivo);
                                const commentsPath = path.join(__dirname, 'public', 'uploads', 'comments', archivo.nombre_archivo);
                                
                                const existsInDeliverables = fs.existsSync(deliverablesPath);
                                const existsInComments = fs.existsSync(commentsPath);
                                
                                console.log(`        En deliverables: ${existsInDeliverables ? '✅' : '❌'}`);
                                console.log(`        En comments: ${existsInComments ? '✅' : '❌'}`);
                                
                                if (!existsInDeliverables && existsInComments) {
                                    console.log(`        🔄 NECESITA MOVER DE COMMENTS A DELIVERABLES`);
                                } else if (!existsInDeliverables && !existsInComments) {
                                    console.log(`        ⚠️  ARCHIVO PERDIDO`);
                                }
                            });
                        }
                    } catch (e) {
                        console.log(`   ❌ Error al parsear observaciones: ${e.message}`);
                        console.log(`   Contenido raw: ${task.observaciones.substring(0, 200)}...`);
                    }
                } else {
                    console.log('   ℹ️  Sin observaciones');
                }
            }
        }

        // Verificar la estructura de la tabla
        console.log('\n🔍 Verificando estructura de la tabla entregables:');
        const [columns] = await connection.execute(`
            DESCRIBE entregables
        `);
        
        console.log('   Columnas disponibles:');
        columns.forEach(col => {
            console.log(`     - ${col.Field} (${col.Type})`);
        });

    } catch (error) {
        console.error('❌ Error durante el análisis:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

debugSpecificTasks();