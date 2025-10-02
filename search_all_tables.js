const mysql = require('mysql2/promise');
require('dotenv').config();

async function searchAllTables() {
    console.log('=== BÚSQUEDA DE TAREA "jjjjjj" EN TODAS LAS TABLAS ===\n');
    
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
        
        // 1. Obtener todas las tablas
        const [tables] = await connection.execute('SHOW TABLES');
        console.log(`📋 Buscando en ${tables.length} tablas...\n`);
        
        let foundInTables = [];
        
        // 2. Buscar en cada tabla
        for (const table of tables) {
            const tableName = Object.values(table)[0];
            
            try {
                // Obtener estructura de la tabla
                const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
                
                // Buscar columnas que podrían contener texto (título, nombre, descripción, etc.)
                const textColumns = columns.filter(col => 
                    col.Type.includes('varchar') || 
                    col.Type.includes('text') || 
                    col.Type.includes('char')
                ).map(col => col.Field);
                
                if (textColumns.length === 0) continue;
                
                // Construir consulta para buscar "jjjjjj" en todas las columnas de texto
                const conditions = textColumns.map(col => `${col} LIKE '%jjjjjj%'`).join(' OR ');
                const query = `SELECT * FROM ${tableName} WHERE ${conditions} LIMIT 5`;
                
                const [results] = await connection.execute(query);
                
                if (results.length > 0) {
                    foundInTables.push({
                        table: tableName,
                        results: results,
                        textColumns: textColumns
                    });
                    
                    console.log(`🎯 ¡ENCONTRADO en tabla "${tableName}"! (${results.length} resultado(s))`);
                    results.forEach((row, index) => {
                        console.log(`   ${index + 1}. ID: ${row.id || 'N/A'}`);
                        
                        // Mostrar las columnas de texto que contienen datos
                        textColumns.forEach(col => {
                            if (row[col] && row[col].toString().toLowerCase().includes('jjjjjj')) {
                                console.log(`      ${col}: "${row[col]}"`);
                            }
                        });
                        
                        // Mostrar fecha de creación si existe
                        if (row.created_at) {
                            console.log(`      Creado: ${row.created_at}`);
                        }
                        console.log('');
                    });
                }
                
            } catch (error) {
                // Ignorar errores de tablas que no podemos consultar
                console.log(`⚠️  Error consultando tabla ${tableName}: ${error.message}`);
            }
        }
        
        if (foundInTables.length === 0) {
            console.log('❌ No se encontró "jjjjjj" en ninguna tabla');
            
            // Mostrar las últimas entradas de las tablas más probables
            console.log('\n📊 Mostrando últimas entradas de tablas relevantes:');
            
            const relevantTables = ['subtareas', 'proyectos', 'entregables', 'tarea_comentarios'];
            
            for (const tableName of relevantTables) {
                try {
                    const [recentEntries] = await connection.execute(`
                        SELECT * FROM ${tableName} 
                        ORDER BY created_at DESC 
                        LIMIT 3
                    `);
                    
                    if (recentEntries.length > 0) {
                        console.log(`\n--- Últimas entradas en ${tableName} ---`);
                        recentEntries.forEach((entry, index) => {
                            console.log(`   ${index + 1}. ID: ${entry.id}`);
                            if (entry.titulo) console.log(`      Título: "${entry.titulo}"`);
                            if (entry.nombre) console.log(`      Nombre: "${entry.nombre}"`);
                            if (entry.descripcion) console.log(`      Descripción: "${entry.descripcion?.substring(0, 50)}..."`);
                            if (entry.created_at) console.log(`      Creado: ${entry.created_at}`);
                        });
                    } else {
                        console.log(`\n--- Tabla ${tableName}: vacía ---`);
                    }
                } catch (error) {
                    console.log(`\n--- Tabla ${tableName}: error (${error.message}) ---`);
                }
            }
        } else {
            // Si encontramos la tarea, buscar archivos adjuntos
            console.log('\n🔍 Buscando archivos adjuntos para las tareas encontradas...');
            
            for (const found of foundInTables) {
                for (const task of found.results) {
                    console.log(`\n📎 Buscando archivos para tarea ID ${task.id} en tabla ${found.table}:`);
                    
                    // Buscar en tarea_comentarios
                    try {
                        const [comments] = await connection.execute(`
                            SELECT id, usuario_id, comentario, archivo_adjunto, created_at 
                            FROM tarea_comentarios 
                            WHERE tarea_id = ?
                        `, [task.id]);
                        
                        if (comments.length > 0) {
                            console.log(`   ✅ ${comments.length} comentario(s) encontrado(s):`);
                            comments.forEach((comment, index) => {
                                console.log(`      ${index + 1}. Archivo: ${comment.archivo_adjunto || 'Ninguno'}`);
                                if (comment.archivo_adjunto) {
                                    console.log(`         Comentario ID: ${comment.id}, Fecha: ${comment.created_at}`);
                                }
                            });
                        } else {
                            console.log(`   ❌ No hay comentarios para esta tarea`);
                        }
                    } catch (error) {
                        console.log(`   ⚠️  Error buscando comentarios: ${error.message}`);
                    }
                }
            }
        }
        
        await connection.end();
        console.log('\n✅ Búsqueda completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

searchAllTables();