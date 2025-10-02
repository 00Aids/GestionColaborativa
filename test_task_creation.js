const Task = require('./src/models/Task');

async function testTaskCreation() {
    console.log('=== PRUEBA DE CREACIÓN DE TAREAS ===\n');
    
    try {
        const taskModel = new Task();
        
        // Primero, vamos a revisar qué proyectos existen
        console.log('1. Revisando proyectos existentes...');
        const projectsQuery = 'SELECT id, titulo FROM proyectos LIMIT 5';
        const projects = await taskModel.query(projectsQuery);
        console.log('Proyectos disponibles:');
        console.table(projects);
        
        if (projects.length === 0) {
            console.log('❌ No hay proyectos disponibles. Creando un proyecto de prueba...');
            
            // Crear un proyecto de prueba
            const createProjectQuery = `
                INSERT INTO proyectos (titulo, descripcion, estudiante_id, area_trabajo_id, created_at, updated_at) 
                VALUES ('Proyecto de Prueba', 'Proyecto creado para pruebas', 1, 1, NOW(), NOW())
            `;
            const projectResult = await taskModel.query(createProjectQuery);
            console.log('✅ Proyecto de prueba creado con ID:', projectResult.insertId);
            
            // Usar el ID del proyecto recién creado
            var proyecto_id = projectResult.insertId;
        } else {
            // Usar el primer proyecto disponible
            var proyecto_id = projects[0].id;
            console.log(`✅ Usando proyecto existente: ${projects[0].titulo} (ID: ${proyecto_id})`);
        }
        
        // Ahora crear la tarea con los valores correctos
        console.log('\n2. Creando tarea de prueba...');
        const taskData = {
            titulo: 'Tarea de Prueba Final',
            descripcion: 'Esta es una tarea creada para probar el formulario Kanban',
            proyecto_id: proyecto_id,
            fase_id: 1,
            fecha_limite: '2024-02-15',
            prioridad: 'medium',
            estado: 'pendiente',
            area_trabajo_id: 1
        };
        
        console.log('Datos de la tarea:');
        console.log(JSON.stringify(taskData, null, 2));
        
        const result = await taskModel.create(taskData);
        console.log('\n✅ ¡Tarea creada exitosamente!');
        console.log('Resultado:', JSON.stringify(result, null, 2));
        
        // Verificar que la tarea se guardó correctamente
        console.log('\n3. Verificando que la tarea se guardó...');
        const savedTask = await taskModel.findById(result.id);
        console.log('Tarea guardada:');
        console.log(JSON.stringify(savedTask, null, 2));
        
        console.log('\n✅ ¡PRUEBA EXITOSA! El formulario Kanban debería funcionar ahora.');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
        console.error('Stack completo:', error.stack);
    }
    
    console.log('\n=== FIN DE LA PRUEBA ===');
}

testTaskCreation();