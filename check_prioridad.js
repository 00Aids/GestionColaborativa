const Task = require('./src/models/Task');

async function checkPrioridadColumn() {
    console.log('=== REVISANDO COLUMNA PRIORIDAD ===\n');
    
    try {
        const taskModel = new Task();
        
        // Revisar la estructura de la columna prioridad
        console.log('1. Revisando estructura de la columna prioridad...');
        const query = 'SHOW COLUMNS FROM entregables WHERE Field = "prioridad"';
        const structure = await taskModel.query(query);
        console.log('Estructura de la columna prioridad:');
        console.table(structure);
        
        // Probar diferentes valores de prioridad
        const testValues = ['baja', 'media', 'alta', 'low', 'medium', 'high', 'Baja', 'Media', 'Alta'];
        
        console.log('\n2. Probando diferentes valores de prioridad...');
        
        for (const prioridad of testValues) {
            try {
                const taskData = {
                    titulo: `Test Prioridad ${prioridad}`,
                    descripcion: 'Test de prioridad',
                    proyecto_id: 1,
                    fase_id: 1,
                    fecha_limite: '2024-02-15',
                    prioridad: prioridad,
                    estado: 'pendiente',
                    area_trabajo_id: 1
                };
                
                const result = await taskModel.create(taskData);
                console.log(`✅ Prioridad "${prioridad}" funciona - ID: ${result.id}`);
                
                // Eliminar la tarea de prueba
                await taskModel.delete(result.id);
                
            } catch (error) {
                console.log(`❌ Prioridad "${prioridad}" falló: ${error.message}`);
            }
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    console.log('\n=== FIN DE LA REVISIÓN ===');
}

checkPrioridadColumn();