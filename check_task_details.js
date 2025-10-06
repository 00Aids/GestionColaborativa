const { pool } = require('./src/config/database');

async function checkTaskDetails() {
    try {
        console.log('=== VERIFICANDO DETALLES DE TAREAS CON ARCHIVOS ADJUNTOS ===');
        
        // Verificar estructura de la tabla entregables
        console.log('\n1. Estructura de la tabla entregables:');
        const [columns] = await pool.execute(`
            SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = 'gestion_academica' 
            AND TABLE_NAME = 'entregables'
            ORDER BY ORDINAL_POSITION
        `);
        
        columns.forEach(col => {
            console.log(`   - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });
        
        // Buscar las tareas más recientes
        console.log('\n2. Entregables más recientes:');
        const [recentTasks] = await pool.execute(`
            SELECT id, titulo, descripcion, archivos_adjuntos, created_at, estado_workflow
            FROM entregables 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        recentTasks.forEach(task => {
            console.log(`   - ID: ${task.id}, Título: ${task.titulo}`);
            console.log(`     Descripción: ${task.descripcion}`);
            console.log(`     Archivos adjuntos: ${task.archivos_adjuntos ? JSON.stringify(JSON.parse(task.archivos_adjuntos), null, 2) : 'Sin archivos'}`);
            console.log(`     Estado: ${task.estado_workflow}, Fecha: ${task.created_at}`);
            console.log('     ---');
        });
        
        // Buscar específicamente las tareas con archivos adjuntos
        console.log('\n3. Entregables con archivos adjuntos:');
        const [tasksWithFiles] = await pool.execute(`
            SELECT id, titulo, archivos_adjuntos, created_at
            FROM entregables 
            WHERE archivos_adjuntos IS NOT NULL 
            AND archivos_adjuntos != '' 
            AND archivos_adjuntos != 'null'
            ORDER BY created_at DESC
        `);
        
        if (tasksWithFiles.length === 0) {
            console.log('   ❌ No se encontraron tareas con archivos adjuntos');
        } else {
            tasksWithFiles.forEach(task => {
                console.log(`   ✅ Tarea ID: ${task.id} - ${task.titulo}`);
                try {
                    const archivos = JSON.parse(task.archivos_adjuntos);
                    console.log(`      Archivos: ${archivos.length} archivo(s)`);
                    archivos.forEach((archivo, index) => {
                        console.log(`        ${index + 1}. ${archivo.nombre_original} (${archivo.tipo_mime})`);
                        console.log(`           Ruta: ${archivo.ruta}`);
                        console.log(`           Tamaño: ${archivo.tamaño} bytes`);
                    });
                } catch (e) {
                    console.log(`      ❌ Error al parsear archivos: ${e.message}`);
                }
                console.log('     ---');
            });
        }
        
        // Verificar si los archivos físicos existen
        console.log('\n4. Verificando archivos físicos:');
        const fs = require('fs');
        const path = require('path');
        
        for (const task of tasksWithFiles) {
            try {
                const archivos = JSON.parse(task.archivos_adjuntos);
                console.log(`   Tarea: ${task.titulo}`);
                
                for (const archivo of archivos) {
                    const exists = fs.existsSync(archivo.ruta);
                    console.log(`     - ${archivo.nombre_original}: ${exists ? '✅ Existe' : '❌ No existe'}`);
                    if (exists) {
                        const stats = fs.statSync(archivo.ruta);
                        console.log(`       Tamaño real: ${stats.size} bytes`);
                    }
                }
            } catch (e) {
                console.log(`     ❌ Error: ${e.message}`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await pool.end();
    }
}

checkTaskDetails();