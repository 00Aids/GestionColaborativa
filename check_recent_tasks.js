const mysql = require('mysql2/promise');

async function checkRecentTasks() {
    console.log('🔍 Verificando tareas recientes en la base de datos...\n');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        // Buscar todas las tareas del proyecto 35 ordenadas por fecha de creación
        console.log('📋 Tareas del proyecto 35 (ordenadas por fecha de creación):');
        const [allTasks] = await connection.execute(`
            SELECT 
                id, 
                titulo, 
                estado_workflow, 
                created_at,
                updated_at,
                prioridad,
                fase_id
            FROM entregables 
            WHERE proyecto_id = ? 
            ORDER BY created_at DESC 
            LIMIT 10
        `, [35]);
        
        if (allTasks.length === 0) {
            console.log('   ❌ No se encontraron tareas para el proyecto 35');
        } else {
            allTasks.forEach((task, index) => {
                const createdTime = new Date(task.created_at).toLocaleString();
                const updatedTime = new Date(task.updated_at).toLocaleString();
                console.log(`   ${index + 1}. ID: ${task.id}`);
                console.log(`      Título: "${task.titulo}"`);
                console.log(`      Estado: ${task.estado_workflow}`);
                console.log(`      Prioridad: ${task.prioridad}`);
                console.log(`      Fase ID: ${task.fase_id}`);
                console.log(`      Creado: ${createdTime}`);
                console.log(`      Actualizado: ${updatedTime}`);
                console.log('      ---');
            });
        }
        
        // Buscar específicamente tareas con título "k"
        console.log('\n🔍 Buscando tareas con título "k":');
        const [kTasks] = await connection.execute(`
            SELECT 
                id, 
                titulo, 
                estado_workflow, 
                created_at,
                proyecto_id
            FROM entregables 
            WHERE titulo LIKE '%k%' 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        if (kTasks.length === 0) {
            console.log('   ❌ No se encontraron tareas con título "k"');
        } else {
            kTasks.forEach((task, index) => {
                const createdTime = new Date(task.created_at).toLocaleString();
                console.log(`   ${index + 1}. ID: ${task.id}, Título: "${task.titulo}", Proyecto: ${task.proyecto_id}, Creado: ${createdTime}`);
            });
        }
        
        // Verificar las últimas 5 tareas creadas en toda la base de datos
        console.log('\n⏰ Últimas 5 tareas creadas en toda la base de datos:');
        const [latestTasks] = await connection.execute(`
            SELECT 
                id, 
                titulo, 
                proyecto_id,
                estado_workflow, 
                created_at
            FROM entregables 
            ORDER BY created_at DESC 
            LIMIT 5
        `);
        
        latestTasks.forEach((task, index) => {
            const createdTime = new Date(task.created_at).toLocaleString();
            console.log(`   ${index + 1}. ID: ${task.id}, Título: "${task.titulo}", Proyecto: ${task.proyecto_id}, Creado: ${createdTime}`);
        });
        
        await connection.end();
        console.log('\n✅ Verificación completada');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkRecentTasks();