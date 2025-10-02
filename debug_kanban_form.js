// Vamos a probar directamente el modelo Task para ver si el problema está en la base de datos
const path = require('path');

// Importar el modelo Task
const Task = require('./src/models/Task');

async function testTaskModel() {
    console.log('=== DIAGNÓSTICO DEL MODELO TASK ===\n');
    
    // Datos de prueba para crear una tarea (solo campos que existen en la tabla)
    const taskData = {
        titulo: 'Tarea de Prueba Diagnóstico',
        descripcion: 'Esta es una tarea creada desde el script de diagnóstico',
        proyecto_id: 1,
        fase_id: 1,
        fecha_limite: '2024-02-15',
        prioridad: 'media',
        estado: 'pendiente',
        area_trabajo_id: 1
        // created_at y updated_at se manejan automáticamente
    };
    
    console.log('1. Datos de la tarea a crear:');
    console.log(JSON.stringify(taskData, null, 2));
    console.log('\n');
    
    try {
        console.log('2. Creando instancia del modelo Task...');
        const taskModel = new Task();
        
        console.log('3. Intentando crear la tarea en la base de datos...');
        const result = await taskModel.create(taskData);
        
        console.log('✅ Tarea creada exitosamente!');
        console.log('Resultado:', JSON.stringify(result, null, 2));
        
        // Verificar que la tarea se guardó correctamente
        console.log('\n4. Verificando que la tarea se guardó...');
        const savedTask = await taskModel.findById(result.id);
        console.log('Tarea guardada:', JSON.stringify(savedTask, null, 2));
        
    } catch (error) {
        console.error('❌ Error al crear la tarea:', error.message);
        console.error('Stack completo:', error.stack);
        
        // Vamos a revisar la estructura de la tabla
        console.log('\n5. Revisando estructura de la tabla...');
        try {
            const taskModel = new Task();
            const query = 'DESCRIBE entregables';
            const structure = await taskModel.query(query);
            console.log('Estructura de la tabla entregables:');
            console.table(structure);
        } catch (structError) {
            console.error('Error al obtener estructura:', structError.message);
        }
    }
    
    console.log('\n=== FIN DEL DIAGNÓSTICO ===');
}

// Ejecutar el diagnóstico
testTaskModel();