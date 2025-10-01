const EntregableController = require('./src/controllers/EntregableController');

async function testEntregableController() {
    console.log('🧪 Iniciando pruebas del EntregableController...\n');
    
    try {
        // Test 1: Verificar que el controlador se puede instanciar
        console.log('✅ Test 1: Instanciación del controlador');
        const entregableController = new EntregableController();
        console.log('   ✓ EntregableController instanciado correctamente');
        
        // Test 2: Verificar que tiene el modelo entregableModel
        console.log('\n✅ Test 2: Verificación del modelo interno');
        if (entregableController.entregableModel) {
            console.log('   ✓ entregableModel existe en el controlador');
        } else {
            console.log('   ❌ entregableModel NO existe en el controlador');
            throw new Error('entregableModel faltante en el controlador');
        }
        
        // Test 3: Verificar métodos principales del controlador
        console.log('\n✅ Test 3: Verificación de métodos principales');
        const methods = [
            'coordinatorReview',
            'updateDeliverableStatus', 
            'getDeliverableDetails',
            'addComment',
            'getDeliverableById',
            'updateStatus'
        ];
        
        for (const method of methods) {
            if (typeof entregableController[method] === 'function') {
                console.log(`   ✓ Método ${method} existe`);
            } else {
                console.log(`   ❌ Método ${method} NO existe`);
                throw new Error(`Método ${method} faltante en el controlador`);
            }
        }
        
        // Test 4: Verificar que el modelo interno tiene los métodos necesarios
        console.log('\n✅ Test 4: Verificación de métodos del modelo interno');
        const modelMethods = [
            'findByAreaForReview',
            'getWorkflowSummary',
            'findById',
            'updateStatusWithWorkflow',
            'findByIdWithDetails',
            'getComments',
            'addComment'
        ];
        
        for (const method of modelMethods) {
            if (typeof entregableController.entregableModel[method] === 'function') {
                console.log(`   ✓ Método del modelo ${method} existe`);
            } else {
                console.log(`   ❌ Método del modelo ${method} NO existe`);
                throw new Error(`Método del modelo ${method} faltante`);
            }
        }
        
        // Test 5: Verificar que no hay referencias a deliverableModel
        console.log('\n✅ Test 5: Verificación de ausencia de referencias obsoletas');
        if (!entregableController.deliverableModel) {
            console.log('   ✓ No hay referencias a deliverableModel (correcto)');
        } else {
            console.log('   ⚠️  Aún existe referencia a deliverableModel (debería eliminarse)');
        }
        
        console.log('\n🎉 Todas las pruebas del EntregableController pasaron exitosamente!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas del EntregableController:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

// Ejecutar las pruebas
if (require.main === module) {
    testEntregableController()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error inesperado:', error);
            process.exit(1);
        });
}

module.exports = testEntregableController;