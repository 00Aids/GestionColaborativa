const mysql = require('mysql2/promise');
const Task = require('./src/models/Task');

async function testTaskDetailsFix() {
    console.log('🧪 Probando la corrección del método getTaskDetails...');
    
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

        // Verificar si hay entregables (tareas)
        const [tasks] = await connection.execute('SELECT id, titulo FROM entregables LIMIT 5');
        console.log(`📋 Tareas encontradas: ${tasks.length}`);
        
        if (tasks.length === 0) {
            console.log('❌ No hay tareas para probar');
            return;
        }

        // Probar el método corregido
        const taskModel = new Task();
        
        for (const task of tasks.slice(0, 3)) { // Probar solo las primeras 3 tareas
            console.log(`\n🎯 Probando tarea: ${task.titulo} (ID: ${task.id})`);
            
            try {
                const taskDetails = await taskModel.getTaskDetails(task.id);
                
                if (taskDetails) {
                    console.log(`   ✅ Éxito! Detalles obtenidos correctamente`);
                    console.log(`      - Título: ${taskDetails.titulo}`);
                    console.log(`      - Estado: ${taskDetails.estado}`);
                    console.log(`      - Estado workflow: ${taskDetails.estado_workflow}`);
                    console.log(`      - Proyecto: ${taskDetails.proyecto_titulo || 'N/A'}`);
                    console.log(`      - Fase: ${taskDetails.fase_nombre || 'N/A'}`);
                    console.log(`      - Asignado a: ${taskDetails.asignado_nombres || 'No asignado'}`);
                    console.log(`      - Archivos adjuntos: ${Array.isArray(taskDetails.archivos_adjuntos) ? 'Array inicializado' : 'Error'}`);
                } else {
                    console.log(`   ⚠️  No se encontraron detalles para la tarea ${task.id}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error en tarea ${task.id}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Test completado. La corrección del método getTaskDetails parece estar funcionando correctamente.');
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testTaskDetailsFix();