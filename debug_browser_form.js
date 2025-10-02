const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugBrowserForm() {
    console.log('🔍 Verificando problemas específicos del navegador...\n');
    
    try {
        // Conectar a la base de datos
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_academica'
        });
        
        console.log('✅ Conexión a la base de datos establecida');
        
        // 1. Verificar las últimas tareas creadas
        console.log('\n📊 Últimas 10 tareas creadas:');
        const [recentTasks] = await connection.execute(`
            SELECT id, titulo, proyecto_id, estado, estado_workflow, created_at 
            FROM entregables 
            ORDER BY created_at DESC 
            LIMIT 10
        `);
        
        recentTasks.forEach((task, index) => {
            console.log(`${index + 1}. ID: ${task.id} | "${task.titulo}" | Proyecto: ${task.proyecto_id} | ${task.created_at}`);
        });
        
        // 2. Verificar tareas del proyecto 35 específicamente
        console.log('\n📋 Tareas del proyecto 35:');
        const [project35Tasks] = await connection.execute(`
            SELECT id, titulo, estado, estado_workflow, created_at 
            FROM entregables 
            WHERE proyecto_id = 35 
            ORDER BY created_at DESC
        `);
        
        project35Tasks.forEach((task, index) => {
            console.log(`${index + 1}. ID: ${task.id} | "${task.titulo}" | Estado: ${task.estado} | Workflow: ${task.estado_workflow}`);
        });
        
        // 3. Verificar si hay tareas con títulos muy cortos (como "k")
        console.log('\n🔍 Buscando tareas con títulos cortos (1-2 caracteres):');
        const [shortTasks] = await connection.execute(`
            SELECT id, titulo, proyecto_id, created_at 
            FROM entregables 
            WHERE LENGTH(titulo) <= 2 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (shortTasks.length > 0) {
            shortTasks.forEach((task, index) => {
                console.log(`${index + 1}. ID: ${task.id} | "${task.titulo}" | Proyecto: ${task.proyecto_id} | ${task.created_at}`);
            });
        } else {
            console.log('   No se encontraron tareas con títulos cortos');
        }
        
        // 4. Verificar la estructura de la tabla entregables
        console.log('\n🏗️ Estructura de la tabla entregables:');
        const [columns] = await connection.execute(`
            DESCRIBE entregables
        `);
        
        console.log('Columnas de la tabla:');
        columns.forEach(col => {
            console.log(`   ${col.Field} | ${col.Type} | ${col.Null} | ${col.Key} | ${col.Default}`);
        });
        
        // 5. Verificar si hay restricciones o triggers
        console.log('\n🔒 Verificando restricciones y triggers:');
        const [triggers] = await connection.execute(`
            SHOW TRIGGERS LIKE 'entregables'
        `);
        
        if (triggers.length > 0) {
            console.log('Triggers encontrados:');
            triggers.forEach(trigger => {
                console.log(`   ${trigger.Trigger} | ${trigger.Event} | ${trigger.Timing}`);
            });
        } else {
            console.log('   No hay triggers en la tabla entregables');
        }
        
        // 6. Verificar logs de errores de MySQL (si están disponibles)
        console.log('\n📝 Verificando configuración de logging:');
        const [logConfig] = await connection.execute(`
            SHOW VARIABLES LIKE '%log%'
        `);
        
        const relevantLogs = logConfig.filter(log => 
            log.Variable_name.includes('error') || 
            log.Variable_name.includes('general') ||
            log.Variable_name.includes('slow')
        );
        
        if (relevantLogs.length > 0) {
            console.log('Configuración de logs relevante:');
            relevantLogs.forEach(log => {
                console.log(`   ${log.Variable_name}: ${log.Value}`);
            });
        }
        
        await connection.end();
        
        console.log('\n💡 RECOMENDACIONES:');
        console.log('1. Verifica que el formulario web esté enviando los datos correctamente');
        console.log('2. Revisa la consola del navegador en busca de errores JavaScript');
        console.log('3. Verifica que no haya validaciones del lado del cliente que estén bloqueando el envío');
        console.log('4. Asegúrate de que el botón de envío no esté deshabilitado');
        console.log('5. Verifica que no haya problemas de CSRF token');
        
        console.log('\n🏁 Verificación completada');
        
    } catch (error) {
        console.error('❌ Error durante la verificación:', error.message);
        console.error('Stack:', error.stack);
    }
}

debugBrowserForm();