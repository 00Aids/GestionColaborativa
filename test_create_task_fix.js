const mysql = require('mysql2/promise');
const Task = require('./src/models/Task');

async function testCreateTaskFix() {
    console.log('🧪 Probando la corrección del método createTask...');
    
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

        // Obtener un proyecto existente para la prueba
        const [projects] = await connection.execute('SELECT id, titulo FROM proyectos LIMIT 1');
        
        if (projects.length === 0) {
            console.log('❌ No se encontraron proyectos para la prueba');
            return;
        }
        
        const project = projects[0];
        console.log(`📋 Usando proyecto: ${project.titulo} (ID: ${project.id})`);

        // Obtener una fase existente
        const [phases] = await connection.execute('SELECT id, nombre FROM fases_proyecto LIMIT 1');
        
        if (phases.length === 0) {
            console.log('❌ No se encontraron fases para la prueba');
            return;
        }
        
        const phase = phases[0];
        console.log(`📝 Usando fase: ${phase.nombre} (ID: ${phase.id})`);

        // Obtener un usuario para asignar
        const [users] = await connection.execute('SELECT id, nombres, apellidos FROM usuarios LIMIT 1');
        
        if (users.length === 0) {
            console.log('❌ No se encontraron usuarios para la prueba');
            return;
        }
        
        const user = users[0];
        console.log(`👤 Usando usuario: ${user.nombres} ${user.apellidos} (ID: ${user.id})`);

        // Crear instancia del modelo Task
        const taskModel = new Task();
        
        // Datos de prueba para crear una tarea
        const taskData = {
            proyecto_id: project.id,
            fase_id: phase.id,
            titulo: 'Tarea de prueba - Test createTask fix',
            descripcion: 'Esta es una tarea de prueba para verificar la corrección del método createTask',
            fecha_limite: '2025-12-31',
            prioridad: 'medium',
            asignado_a: user.id,
            estimacion_horas: 8,
            etiquetas: 'test,fix,backend',
            estado_workflow: 'todo',
            tipo_enfoque: 'feature',
            archivos_adjuntos: [
                {
                    nombre_original: 'test_file.txt',
                    nombre_archivo: 'test-file-123.txt',
                    ruta: '/uploads/test/test-file-123.txt',
                    tipo_mime: 'text/plain',
                    tamaño: 1024
                },
                {
                    nombre_original: 'image_test.jpg',
                    nombre_archivo: 'image-test-456.jpg',
                    ruta: '/uploads/test/image-test-456.jpg',
                    tipo_mime: 'image/jpeg',
                    tamaño: 2048
                }
            ]
        };

        console.log('\n🎯 Probando creación de tarea con archivos adjuntos...');
        console.log('Datos de la tarea:');
        console.log(`   - Título: ${taskData.titulo}`);
        console.log(`   - Proyecto ID: ${taskData.proyecto_id}`);
        console.log(`   - Fase ID: ${taskData.fase_id}`);
        console.log(`   - Asignado a: ${taskData.asignado_a}`);
        console.log(`   - Archivos adjuntos: ${taskData.archivos_adjuntos.length} archivos`);

        try {
            const taskId = await taskModel.createTask(taskData);
            
            if (taskId) {
                console.log(`✅ ¡Éxito! Tarea creada con ID: ${taskId}`);
                
                // Verificar que la tarea se creó correctamente
                const [createdTask] = await connection.execute(
                    'SELECT * FROM entregables WHERE id = ?',
                    [taskId]
                );
                
                if (createdTask.length > 0) {
                    const task = createdTask[0];
                    console.log('\n📊 Detalles de la tarea creada:');
                    console.log(`   - ID: ${task.id}`);
                    console.log(`   - Título: ${task.titulo}`);
                    console.log(`   - Estado: ${task.estado}`);
                    console.log(`   - Estado workflow: ${task.estado_workflow}`);
                    console.log(`   - Asignado a: ${task.asignado_a}`);
                    
                    // Verificar las observaciones (donde se almacenan los archivos)
                    if (task.observaciones) {
                        try {
                            const observaciones = JSON.parse(task.observaciones);
                            console.log(`   - Tipo enfoque: ${observaciones.tipo_enfoque || 'N/A'}`);
                            console.log(`   - Estimación horas: ${observaciones.estimacion_horas || 'N/A'}`);
                            console.log(`   - Etiquetas: ${observaciones.etiquetas || 'N/A'}`);
                            
                            if (observaciones.archivos_adjuntos && Array.isArray(observaciones.archivos_adjuntos)) {
                                console.log(`   - Archivos adjuntos: ${observaciones.archivos_adjuntos.length} archivos almacenados correctamente`);
                                observaciones.archivos_adjuntos.forEach((archivo, index) => {
                                    console.log(`     ${index + 1}. ${archivo.nombre_original} (${archivo.tipo_mime})`);
                                });
                            } else {
                                console.log(`   - ⚠️  Archivos adjuntos: No se encontraron en observaciones`);
                            }
                        } catch (parseError) {
                            console.log(`   - ❌ Error al parsear observaciones: ${parseError.message}`);
                        }
                    } else {
                        console.log(`   - ⚠️  Observaciones: NULL`);
                    }
                } else {
                    console.log(`   ❌ No se pudo recuperar la tarea creada`);
                }
                
            } else {
                console.log(`   ❌ No se obtuvo ID de la tarea creada`);
            }
            
        } catch (createError) {
            console.log(`   ❌ Error al crear tarea: ${createError.message}`);
            console.log(`      Stack: ${createError.stack.split('\n')[1]}`);
        }
        
        console.log('\n🎉 Test de creación de tareas completado');
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testCreateTaskFix();