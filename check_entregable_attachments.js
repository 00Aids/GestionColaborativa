const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEntregableAttachments() {
    console.log('=== VERIFICACIÓN DE ARCHIVOS ADJUNTOS PARA ENTREGABLE "jjjjjj" (ID: 38) ===\n');
    
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
        
        const entregableId = 38;
        
        // 1. Obtener información completa del entregable
        console.log('1. Información del entregable:');
        const [entregables] = await connection.execute(`
            SELECT * FROM entregables WHERE id = ?
        `, [entregableId]);
        
        if (entregables.length === 0) {
            console.log('❌ No se encontró el entregable con ID 38');
            await connection.end();
            return;
        }
        
        const entregable = entregables[0];
        console.log(`✅ Entregable encontrado:`);
        console.log(`   ID: ${entregable.id}`);
        console.log(`   Título: "${entregable.titulo}"`);
        console.log(`   Descripción: "${entregable.descripcion}"`);
        console.log(`   Proyecto ID: ${entregable.proyecto_id}`);
        console.log(`   Fase ID: ${entregable.fase_id}`);
        console.log(`   Estado: ${entregable.estado}`);
        console.log(`   Creado: ${entregable.created_at}`);
        console.log(`   Actualizado: ${entregable.updated_at}`);
        
        // Verificar si hay columnas de archivos en la tabla entregables
        console.log('\n2. Estructura de la tabla entregables:');
        const [columns] = await connection.execute(`DESCRIBE entregables`);
        
        const fileColumns = columns.filter(col => 
            col.Field.toLowerCase().includes('archivo') || 
            col.Field.toLowerCase().includes('file') || 
            col.Field.toLowerCase().includes('attachment') ||
            col.Field.toLowerCase().includes('adjunto') ||
            col.Field.toLowerCase().includes('ruta') ||
            col.Field.toLowerCase().includes('path')
        );
        
        if (fileColumns.length > 0) {
            console.log(`✅ Columnas relacionadas con archivos encontradas:`);
            fileColumns.forEach(col => {
                console.log(`   - ${col.Field} (${col.Type}): ${entregable[col.Field] || 'NULL'}`);
            });
        } else {
            console.log(`❌ No se encontraron columnas específicas para archivos en la tabla entregables`);
        }
        
        // 3. Buscar en entregable_comentarios
        console.log('\n3. Verificando comentarios del entregable:');
        const [comentarios] = await connection.execute(`
            SELECT 
                id,
                usuario_id,
                comentario,
                archivo_adjunto,
                tipo,
                created_at
            FROM entregable_comentarios 
            WHERE entregable_id = ?
            ORDER BY created_at DESC
        `, [entregableId]);
        
        if (comentarios.length === 0) {
            console.log('❌ No se encontraron comentarios para este entregable');
        } else {
            console.log(`✅ Encontrados ${comentarios.length} comentario(s):`);
            comentarios.forEach((comentario, index) => {
                console.log(`   ${index + 1}. ID: ${comentario.id}, Usuario: ${comentario.usuario_id}, Tipo: ${comentario.tipo}`);
                console.log(`      Comentario: ${comentario.comentario ? comentario.comentario.substring(0, 100) + '...' : 'N/A'}`);
                console.log(`      Archivo adjunto: ${comentario.archivo_adjunto || 'Ninguno'}`);
                console.log(`      Fecha: ${comentario.created_at}`);
                console.log('');
            });
            
            // Verificar si hay archivos adjuntos
            const comentariosConArchivos = comentarios.filter(c => c.archivo_adjunto && c.archivo_adjunto.trim() !== '');
            if (comentariosConArchivos.length > 0) {
                console.log(`🎉 ¡ARCHIVOS ENCONTRADOS! ${comentariosConArchivos.length} comentario(s) con archivos adjuntos:`);
                comentariosConArchivos.forEach((comentario, index) => {
                    console.log(`   ${index + 1}. Archivo: ${comentario.archivo_adjunto}`);
                    console.log(`      Comentario ID: ${comentario.id}`);
                    console.log(`      Usuario: ${comentario.usuario_id}`);
                    console.log(`      Fecha subida: ${comentario.created_at}`);
                    console.log('');
                });
            } else {
                console.log('❌ No se encontraron archivos adjuntos en los comentarios');
            }
        }
        
        // 4. Buscar en otras tablas que puedan tener referencia a entregables
        console.log('\n4. Verificando otras tablas con referencia a entregables...');
        
        const [allTables] = await connection.execute('SHOW TABLES');
        
        for (const table of allTables) {
            const tableName = Object.values(table)[0];
            
            // Saltar tablas que ya verificamos
            if (tableName === 'entregables' || tableName === 'entregable_comentarios') continue;
            
            try {
                // Verificar si la tabla tiene una columna entregable_id
                const [tableColumns] = await connection.execute(`DESCRIBE ${tableName}`);
                const hasEntregableId = tableColumns.some(col => col.Field === 'entregable_id');
                
                if (hasEntregableId) {
                    const [records] = await connection.execute(`SELECT * FROM ${tableName} WHERE entregable_id = ? LIMIT 5`, [entregableId]);
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
        
        // 5. Verificar archivos en el sistema de archivos
        console.log('\n5. Verificando archivos en el sistema de archivos...');
        const fs = require('fs');
        const path = require('path');
        
        const uploadPaths = [
            './public/uploads/entregables',
            './public/uploads/deliverables',
            './public/uploads/attachments',
            './public/uploads/comentarios',
            './public/uploads',
            './uploads',
            './storage/uploads',
            './storage/entregables'
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
                            recentFiles.slice(0, 10).forEach(file => {
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

checkEntregableAttachments();