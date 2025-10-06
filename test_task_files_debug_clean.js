const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function testTaskCreationWithFiles() {
    console.log('🔍 Probando creación de tarea con archivos adjuntos...');
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root', 
            password: 'root',
            database: 'gestion_academica'
        });
        
        console.log('✅ Conexión establecida');
        
        // 1. Buscar la tarea más reciente
        const [recentTasks] = await connection.execute(`
            SELECT id, titulo, observaciones, created_at
            FROM entregables 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        console.log(`\n📋 Últimas ${recentTasks.length} tareas creadas:`);
        recentTasks.forEach((task, index) => {
            console.log(`   ${index + 1}. ID: ${task.id} - "${task.titulo}" (${task.created_at})`);
            
            if (task.observaciones) {
                try {
                    const obs = JSON.parse(task.observaciones);
                    if (obs.archivos_adjuntos && obs.archivos_adjuntos.length > 0) {
                        console.log(`      📎 Archivos adjuntos: ${obs.archivos_adjuntos.length}`);
                        obs.archivos_adjuntos.forEach((archivo, i) => {
                            console.log(`         ${i + 1}. ${archivo.nombre_original} (${archivo.ruta})`);
                        });
                    } else {
                        console.log('      ❌ Sin archivos adjuntos');
                    }
                } catch (e) {
                    console.log('      ❌ Error al parsear observaciones');
                }
            } else {
                console.log('      ❌ Sin observaciones');
            }
        });
        
        // 2. Verificar directorio de uploads
        const uploadsDir = path.join(__dirname, 'public', 'uploads', 'deliverables');
        console.log(`\n📁 Verificando directorio: ${uploadsDir}`);
        
        if (fs.existsSync(uploadsDir)) {
            const files = fs.readdirSync(uploadsDir);
            console.log(`   ✅ Directorio existe con ${files.length} archivos:`);
            files.forEach((file, index) => {
                const filePath = path.join(uploadsDir, file);
                const stats = fs.statSync(filePath);
                console.log(`      ${index + 1}. ${file} (${stats.size} bytes, ${stats.mtime})`);
            });
        } else {
            console.log('   ❌ Directorio no existe');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
    }
}

testTaskCreationWithFiles();