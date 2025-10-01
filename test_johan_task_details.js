const mysql = require('mysql2/promise');
const Task = require('./src/models/Task');

async function testJohanTaskDetails() {
    console.log('🧪 Probando getTaskDetails con el usuario johan123crisdu@hotmail.com...');
    
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

        // Verificar si existe el usuario johan123crisdu@hotmail.com
        const [users] = await connection.execute(
            'SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ?',
            ['johan123crisdu@hotmail.com']
        );
        
        if (users.length === 0) {
            console.log('❌ Usuario johan123crisdu@hotmail.com no encontrado');
            return;
        }
        
        const johanUser = users[0];
        console.log(`👤 Usuario encontrado: ${johanUser.nombres} ${johanUser.apellidos} (ID: ${johanUser.id})`);

        // Verificar proyectos asociados al usuario
        const [projects] = await connection.execute(`
            SELECT DISTINCT p.id, p.titulo 
            FROM proyectos p
            LEFT JOIN entregables e ON p.id = e.proyecto_id
            WHERE p.director_id = ? OR p.estudiante_id = ? OR e.asignado_a = ?
            LIMIT 5
        `, [johanUser.id, johanUser.id, johanUser.id]);
        
        console.log(`📋 Proyectos asociados: ${projects.length}`);

        // Verificar entregables/tareas del usuario
        const [tasks] = await connection.execute(`
            SELECT e.id, e.titulo, e.estado, e.observaciones,
                   JSON_VALID(e.observaciones) as observaciones_valid_json
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.director_id = ? OR p.estudiante_id = ? OR e.asignado_a = ?
            LIMIT 10
        `, [johanUser.id, johanUser.id, johanUser.id]);
        
        console.log(`📝 Tareas encontradas: ${tasks.length}`);
        
        if (tasks.length === 0) {
            console.log('ℹ️  No hay tareas específicas para este usuario, probando con tareas generales...');
            
            // Obtener tareas generales para probar
            const [generalTasks] = await connection.execute('SELECT id, titulo FROM entregables LIMIT 5');
            
            if (generalTasks.length > 0) {
                tasks.push(...generalTasks.map(t => ({
                    ...t,
                    estado: 'pendiente',
                    observaciones: null,
                    observaciones_valid_json: 0
                })));
            }
        }

        // Verificar el estado de las observaciones
        console.log('\n📊 Estado de las observaciones:');
        tasks.forEach(task => {
            console.log(`   - Tarea ${task.id}: JSON válido = ${task.observaciones_valid_json ? 'Sí' : 'No'}`);
            if (task.observaciones) {
                console.log(`     Observaciones: ${task.observaciones.substring(0, 100)}...`);
            }
        });

        // Probar el método getTaskDetails corregido
        const taskModel = new Task();
        
        console.log('\n🎯 Probando método getTaskDetails corregido:');
        for (const task of tasks.slice(0, 3)) {
            console.log(`\n   Probando tarea: ${task.titulo} (ID: ${task.id})`);
            
            try {
                const taskDetails = await taskModel.getTaskDetails(task.id);
                
                if (taskDetails) {
                    console.log(`   ✅ Éxito! Detalles obtenidos correctamente`);
                    console.log(`      - Título: ${taskDetails.titulo}`);
                    console.log(`      - Estado: ${taskDetails.estado}`);
                    console.log(`      - Estado workflow: ${taskDetails.estado_workflow || 'N/A'}`);
                    console.log(`      - Proyecto: ${taskDetails.proyecto_titulo || 'N/A'}`);
                    console.log(`      - Asignado a: ${taskDetails.asignado_nombres || 'No asignado'}`);
                    console.log(`      - Archivos adjuntos: ${Array.isArray(taskDetails.archivos_adjuntos) ? 'Array inicializado' : 'Error'}`);
                } else {
                    console.log(`   ⚠️  No se encontraron detalles para la tarea ${task.id}`);
                }
                
            } catch (error) {
                console.log(`   ❌ Error en tarea ${task.id}: ${error.message}`);
            }
        }
        
        console.log('\n🎉 Test completado para el usuario johan123crisdu@hotmail.com');
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testJohanTaskDetails();