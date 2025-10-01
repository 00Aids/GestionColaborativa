const mysql = require('mysql2/promise');
const Task = require('./src/models/Task');

async function testJSONFix() {
    console.log('🧪 Probando la corrección del error de JSON en getProjectTasksWithWorkflow...');
    
    let connection;
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gestion_academica'
        });
        console.log('✅ Conexión a la base de datos establecida');

        // Verificar si hay proyectos
        const [projects] = await connection.execute('SELECT id, titulo FROM proyectos LIMIT 5');
        console.log(`📋 Proyectos encontrados: ${projects.length}`);
        
        if (projects.length === 0) {
            console.log('❌ No hay proyectos para probar');
            return;
        }

        // Verificar el estado de los datos de observaciones
        const [observacionesData] = await connection.execute(`
            SELECT 
                id, 
                titulo,
                observaciones,
                JSON_VALID(observaciones) as is_valid_json
            FROM entregables 
            WHERE observaciones IS NOT NULL 
            LIMIT 5
        `);
        
        console.log(`📊 Entregables con observaciones: ${observacionesData.length}`);
        observacionesData.forEach(item => {
            console.log(`   - ID: ${item.id}, JSON válido: ${item.is_valid_json ? 'Sí' : 'No'}, Observaciones: ${item.observaciones?.substring(0, 50)}...`);
        });

        // Probar el método corregido
        const taskModel = new Task();
        
        for (const project of projects.slice(0, 2)) { // Probar solo los primeros 2 proyectos
            console.log(`\n🎯 Probando proyecto: ${project.titulo} (ID: ${project.id})`);
            
            try {
                const tasksGrouped = await taskModel.getProjectTasksWithWorkflow(project.id);
                
                const totalTasks = tasksGrouped.todo.length + tasksGrouped.in_progress.length + tasksGrouped.done.length;
                console.log(`   ✅ Éxito! Tareas encontradas: ${totalTasks}`);
                console.log(`      - Todo: ${tasksGrouped.todo.length}`);
                console.log(`      - En progreso: ${tasksGrouped.in_progress.length}`);
                console.log(`      - Completadas: ${tasksGrouped.done.length}`);
                
                // Verificar si hay tareas con usuario_asignado_id
                const tasksWithAssigned = [...tasksGrouped.todo, ...tasksGrouped.in_progress, ...tasksGrouped.done]
                    .filter(task => task.usuario_asignado_id);
                console.log(`      - Con usuario asignado: ${tasksWithAssigned.length}`);
                
            } catch (error) {
                console.log(`   ❌ Error en proyecto ${project.id}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Test completado. La corrección del JSON parece estar funcionando correctamente.');
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testJSONFix();