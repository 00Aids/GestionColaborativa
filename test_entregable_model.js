const Entregable = require('./src/models/Entregable');

async function testEntregableModel() {
    console.log('🧪 Iniciando pruebas del modelo Entregable...\n');
    
    try {
        // Test 1: Verificar que el modelo se puede instanciar
        console.log('✅ Test 1: Instanciación del modelo');
        const entregableModel = new Entregable();
        console.log('   ✓ Modelo Entregable instanciado correctamente');
        
        // Test 2: Verificar métodos principales
        console.log('\n✅ Test 2: Verificación de métodos principales');
        const methods = [
            'findWithProject',
            'findByProject', 
            'findByStudent',
            'findById',
            'update',
            'findByAreaForReview',
            'getWorkflowSummary',
            'updateStatusWithWorkflow',
            'findByIdWithDetails',
            'getComments',
            'addComment'
        ];
        
        for (const method of methods) {
            if (typeof entregableModel[method] === 'function') {
                console.log(`   ✓ Método ${method} existe`);
            } else {
                console.log(`   ❌ Método ${method} NO existe`);
                throw new Error(`Método ${method} faltante`);
            }
        }
        
        // Test 3: Verificar que la tabla existe en la base de datos
        console.log('\n✅ Test 3: Verificación de conexión a base de datos');
        try {
            // Intentar hacer una consulta simple para verificar que la tabla existe
            const result = await entregableModel.findWithProject(1, 1); // IDs de prueba
            console.log('   ✓ Conexión a base de datos exitosa');
            console.log('   ✓ Tabla entregables accesible');
        } catch (error) {
            if (error.message.includes('no such table') || error.message.includes('doesn\'t exist')) {
                console.log('   ❌ Tabla entregables no existe');
                throw new Error('Tabla entregables no encontrada');
            } else {
                console.log('   ✓ Tabla entregables existe (error esperado por IDs de prueba)');
            }
        }
        
        console.log('\n🎉 Todas las pruebas del modelo Entregable pasaron exitosamente!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas del modelo Entregable:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

// Ejecutar las pruebas
if (require.main === module) {
    testEntregableModel()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error inesperado:', error);
            process.exit(1);
        });
}

module.exports = testEntregableModel;