const mysql = require('mysql2/promise');
const Task = require('./src/models/Task');

async function testObservacionesValidation() {
    console.log('🧪 Probando validación de observaciones en getTaskDetails...');
    
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

        // Obtener algunas tareas para probar
        const [tasks] = await connection.execute(`
            SELECT id, titulo, observaciones, 
                   JSON_VALID(observaciones) as is_valid_json,
                   CASE 
                       WHEN observaciones IS NULL THEN 'NULL'
                       WHEN observaciones = '' THEN 'EMPTY'
                       WHEN JSON_VALID(observaciones) = 1 THEN 'VALID_JSON'
                       ELSE 'INVALID_JSON'
                   END as observaciones_type
            FROM entregables 
            LIMIT 10
        `);
        
        console.log(`📝 Tareas encontradas: ${tasks.length}`);
        
        // Mostrar el estado de las observaciones
        console.log('\n📊 Estado de las observaciones:');
        tasks.forEach(task => {
            console.log(`   - Tarea ${task.id} (${task.titulo.substring(0, 30)}...): ${task.observaciones_type}`);
            if (task.observaciones && task.observaciones.length > 0) {
                console.log(`     Contenido: ${task.observaciones.substring(0, 50)}...`);
            }
        });

        // Probar el método getTaskDetails con diferentes tipos de observaciones
        const taskModel = new Task();
        
        console.log('\n🎯 Probando método getTaskDetails con diferentes tipos de observaciones:');
        
        for (const task of tasks.slice(0, 5)) {
            console.log(`\n   Probando tarea: ${task.titulo.substring(0, 40)}... (ID: ${task.id})`);
            console.log(`   Tipo de observaciones: ${task.observaciones_type}`);
            
            try {
                const taskDetails = await taskModel.getTaskDetails(task.id);
                
                if (taskDetails) {
                    console.log(`   ✅ Éxito! Detalles obtenidos correctamente`);
                    console.log(`      - Título: ${taskDetails.titulo}`);
                    console.log(`      - Estado: ${taskDetails.estado}`);
                    console.log(`      - Asignado a: ${taskDetails.asignado_nombres || 'No asignado'}`);
                    
                    // Verificar que archivos_adjuntos esté inicializado
                    if (Array.isArray(taskDetails.archivos_adjuntos)) {
                        console.log(`      - Archivos adjuntos: Array inicializado (${taskDetails.archivos_adjuntos.length} elementos)`);
                    } else {
                        console.log(`      - ⚠️  Archivos adjuntos: No es un array`);
                    }
                } else {
                    console.log(`   ⚠️  No se encontraron detalles para la tarea ${task.id}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error en tarea ${task.id}: ${error.message}`);
                console.log(`      Stack: ${error.stack.split('\n')[1]}`);
            }
        }
        
        // Probar específicamente con una tarea que tenga JSON válido en observaciones
        console.log('\n🔍 Buscando tareas con JSON válido en observaciones...');
        const [validJsonTasks] = await connection.execute(`
            SELECT id, titulo, observaciones
            FROM entregables 
            WHERE JSON_VALID(observaciones) = 1
            LIMIT 3
        `);
        
        if (validJsonTasks.length > 0) {
            console.log(`   Encontradas ${validJsonTasks.length} tareas con JSON válido`);
            
            for (const task of validJsonTasks) {
                console.log(`\n   Probando tarea con JSON válido: ${task.titulo.substring(0, 40)}... (ID: ${task.id})`);
                
                try {
                    const taskDetails = await taskModel.getTaskDetails(task.id);
                    console.log(`   ✅ Éxito! JSON válido procesado correctamente`);
                    console.log(`      - Asignado a: ${taskDetails.asignado_nombres || 'No asignado'}`);
                } catch (error) {
                    console.log(`   ❌ Error con JSON válido: ${error.message}`);
                }
            }
        } else {
            console.log('   No se encontraron tareas con JSON válido en observaciones');
        }
        
        console.log('\n🎉 Test de validación de observaciones completado');
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testObservacionesValidation();