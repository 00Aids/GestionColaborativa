const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkEntregableCommentsStructure() {
    console.log('=== VERIFICACIÓN DE ESTRUCTURA DE ENTREGABLE_COMENTARIOS ===\n');
    
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
        
        // 1. Verificar estructura de entregable_comentarios
        console.log('1. Estructura de la tabla entregable_comentarios:');
        const [columns] = await connection.execute(`DESCRIBE entregable_comentarios`);
        
        console.log('Columnas encontradas:');
        columns.forEach(column => {
            console.log(`   - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
        });
        
        // 2. Buscar comentarios para el entregable 38 con todas las columnas
        console.log('\n2. Comentarios para el entregable ID 38:');
        const [comentarios] = await connection.execute(`
            SELECT * FROM entregable_comentarios WHERE entregable_id = ?
        `, [38]);
        
        if (comentarios.length === 0) {
            console.log('❌ No se encontraron comentarios para el entregable ID 38');
        } else {
            console.log(`✅ Encontrados ${comentarios.length} comentario(s):`);
            comentarios.forEach((comentario, index) => {
                console.log(`   ${index + 1}. Comentario completo:`);
                Object.keys(comentario).forEach(key => {
                    console.log(`      ${key}: ${comentario[key]}`);
                });
                console.log('');
            });
        }
        
        // 3. Verificar si hay archivos en el sistema de archivos recientes
        console.log('\n3. Verificando archivos recientes en el sistema de archivos...');
        const fs = require('fs');
        const path = require('path');
        
        const uploadPaths = [
            './public/uploads',
            './uploads',
            './public/uploads/entregables',
            './public/uploads/attachments'
        ];
        
        for (const uploadPath of uploadPaths) {
            try {
                if (fs.existsSync(uploadPath)) {
                    const files = fs.readdirSync(uploadPath);
                    
                    if (files.length > 0) {
                        // Filtrar archivos de las últimas 2 horas
                        const veryRecentFiles = files.filter(file => {
                            try {
                                const filePath = path.join(uploadPath, file);
                                const stats = fs.statSync(filePath);
                                const now = new Date();
                                const fileTime = new Date(stats.mtime);
                                const diffHours = (now - fileTime) / (1000 * 60 * 60);
                                return diffHours <= 2; // Archivos de las últimas 2 horas
                            } catch {
                                return false;
                            }
                        });
                        
                        if (veryRecentFiles.length > 0) {
                            console.log(`📁 ${uploadPath}: ${veryRecentFiles.length} archivo(s) muy reciente(s):`);
                            veryRecentFiles.forEach(file => {
                                const filePath = path.join(uploadPath, file);
                                const stats = fs.statSync(filePath);
                                console.log(`   - ${file}`);
                                console.log(`     Tamaño: ${stats.size} bytes`);
                                console.log(`     Modificado: ${stats.mtime}`);
                                console.log(`     Es imagen: ${/\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(file) ? 'Sí' : 'No'}`);
                                console.log('');
                            });
                        } else {
                            console.log(`📁 ${uploadPath}: No hay archivos muy recientes (últimas 2h)`);
                        }
                    } else {
                        console.log(`📁 ${uploadPath}: Directorio vacío`);
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

checkEntregableCommentsStructure();