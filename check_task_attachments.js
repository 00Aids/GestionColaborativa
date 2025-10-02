const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTaskAttachments() {
    console.log('=== VERIFICACIÓN DE ARCHIVOS ADJUNTOS PARA TAREA "jjjjjj" ===\n');
    
    try {
        // Conexión a la base de datos
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'gestion_academica',
            port: process.env.DB_PORT || 3306
        });
        
        console.log('✅ Conectado a la base de datos\n');
        
        // 1. Buscar la tarea "jjjjjj"
        console.log('1. Buscando la tarea "jjjjjj"...');
        const [tasks] = await connection.execute(`
            SELECT 
                id,
                tarea_padre_id,
                titulo,
                descripcion,
                estado,
                asignado_a,
                completado_por,
                fecha_completado,
                created_at,
                updated_at
            FROM subtareas 
            WHERE titulo LIKE '%jjjjjj%'
            ORDER BY created_at DESC
            LIMIT 5
        `);
        
        if (tasks.length === 0) {
            console.log('❌ No se encontró ninguna tarea con el título "jjjjjj"');
            
            // Buscar las últimas tareas creadas
            console.log('\n2. Mostrando las últimas 10 tareas creadas:');
            const [recentTasks] = await connection.execute(`
                SELECT 
                    id,
                    tarea_padre_id,
                    titulo,
                    descripcion,
                    estado,
                    asignado_a,
                    created_at
                FROM subtareas 
                ORDER BY created_at DESC
                LIMIT 10
            `);
            
            recentTasks.forEach((task, index) => {
                console.log(`   ${index + 1}. ID: ${task.id}, Título: "${task.titulo}", Estado: ${task.estado}, Creada: ${task.created_at}`);
            });
            
            await connection.end();
            return;
        }
        
        console.log(`✅ Encontrada(s) ${tasks.length} tarea(s) con "jjjjjj":`);
        tasks.forEach((task, index) => {
            console.log(`   ${index + 1}. ID: ${task.id}, Título: "${task.titulo}", Tarea Padre: ${task.tarea_padre_id}, Estado: ${task.estado}, Creada: ${task.created_at}`);
        });
        
        const taskId = tasks[0].id;
        console.log(`\n📋 Verificando archivos para la tarea ID: ${taskId}`);
        
        // 2. Verificar archivos en tarea_comentarios (campo archivo_adjunto)
        console.log('\n3. Verificando archivos en comentarios de la tarea...');
        const [comments] = await connection.execute(`
            SELECT 
                id,
                usuario_id,
                comentario,
                tipo,
                archivo_adjunto,
                created_at
            FROM tarea_comentarios 
            WHERE tarea_id = ?
            ORDER BY created_at DESC
        `, [taskId]);
        
        if (comments.length === 0) {
            console.log('❌ No se encontraron comentarios para esta tarea');
        } else {
            console.log(`✅ Encontrados ${comments.length} comentario(s):`);
            comments.forEach((comment, index) => {
                console.log(`   ${index + 1}. ID: ${comment.id}, Usuario: ${comment.usuario_id}, Tipo: ${comment.tipo}`);
                console.log(`      Comentario: ${comment.comentario ? comment.comentario.substring(0, 100) + '...' : 'N/A'}`);
                console.log(`      Archivo adjunto: ${comment.archivo_adjunto || 'Ninguno'}`);
                console.log(`      Fecha: ${comment.created_at}`);
                console.log('');
            });
            
            // Verificar si hay archivos adjuntos
            const commentsWithFiles = comments.filter(c => c.archivo_adjunto && c.archivo_adjunto.trim() !== '');
            if (commentsWithFiles.length > 0) {
                console.log(`🎉 ¡ARCHIVOS ENCONTRADOS! ${commentsWithFiles.length} comentario(s) con archivos adjuntos:`);
                commentsWithFiles.forEach((comment, index) => {
                    console.log(`   ${index + 1}. Archivo: ${comment.archivo_adjunto}`);
                    console.log(`      Comentario ID: ${comment.id}`);
                    console.log(`      Fecha subida: ${comment.created_at}`);
                });
            } else {
                console.log('❌ No se encontraron archivos adjuntos en los comentarios');
            }
        }
        
        // 3. Verificar si hay otras tablas de archivos que no detectamos antes
        console.log('\n4. Verificando otras posibles ubicaciones de archivos...');
        
        // Buscar en todas las tablas si hay referencias a esta tarea
        const [allTables] = await connection.execute('SHOW TABLES');
        
        for (const table of allTables) {
            const tableName = Object.values(table)[0];
            
            // Saltar tablas que ya verificamos
            if (tableName === 'subtareas' || tableName === 'tarea_comentarios') continue;
            
            try {
                // Verificar si la tabla tiene una columna tarea_id
                const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
                const hasTaskId = columns.some(col => col.Field === 'tarea_id');
                
                if (hasTaskId) {
                    const [records] = await connection.execute(`SELECT * FROM ${tableName} WHERE tarea_id = ? LIMIT 5`, [taskId]);
                    if (records.length > 0) {
                        console.log(`✅ Encontrados ${records.length} registro(s) en tabla ${tableName}:`);
                        records.forEach((record, index) => {
                            console.log(`   ${index + 1}. ${JSON.stringify(record)}`);
                        });
                    }
                }
            } catch (error) {
                // Ignorar errores de tablas que no podemos consultar
            }
        }
        
        // 4. Verificar archivos en el sistema de archivos
        console.log('\n5. Verificando archivos en el sistema de archivos...');
        const fs = require('fs');
        const path = require('path');
        
        const uploadPaths = [
            './public/uploads/tasks',
            './public/uploads/tareas',
            './public/uploads/attachments',
            './public/uploads/comentarios',
            './public/uploads',
            './uploads',
            './storage/uploads'
        ];
        
        for (const uploadPath of uploadPaths) {
            try {
                if (fs.existsSync(uploadPath)) {
                    const files = fs.readdirSync(uploadPath);
                    console.log(`📁 Directorio ${uploadPath}: ${files.length} archivo(s)`);
                    
                    if (files.length > 0) {
                        // Mostrar archivos recientes (últimas 24 horas)
                        const recentFiles = files.filter(file => {
                            try {
                                const filePath = path.join(uploadPath, file);
                                const stats = fs.statSync(filePath);
                                const now = new Date();
                                const fileTime = new Date(stats.mtime);
                                const diffHours = (now - fileTime) / (1000 * 60 * 60);
                                return diffHours <= 24; // Archivos de las últimas 24 horas
                            } catch {
                                return false;
                            }
                        });
                        
                        if (recentFiles.length > 0) {
                            console.log(`   📄 Archivos recientes (últimas 24h): ${recentFiles.length}`);
                            recentFiles.slice(0, 5).forEach(file => {
                                const filePath = path.join(uploadPath, file);
                                const stats = fs.statSync(filePath);
                                console.log(`      - ${file} (${stats.size} bytes, ${stats.mtime})`);
                            });
                        } else {
                            console.log(`   📄 No hay archivos recientes en este directorio`);
                        }
                    }
                } else {
                    console.log(`❌ Directorio ${uploadPath} no existe`);
                }
            } catch (error) {
                console.log(`❌ Error accediendo a ${uploadPath}: ${error.message}`);
            }
        }
        
        await connection.end();
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkTaskAttachments();