const DashboardController = require('./src/controllers/DashboardController');

async function testDashboardEntregable() {
    console.log('🧪 Iniciando pruebas de DashboardController con entregableModel...\n');
    
    try {
        // Test 1: Verificar que el controlador se puede instanciar
        console.log('✅ Test 1: Instanciación del controlador');
        const dashboardController = new DashboardController();
        console.log('   ✓ DashboardController instanciado correctamente');
        
        // Test 2: Verificar que tiene el modelo entregableModel
        console.log('\n✅ Test 2: Verificación del modelo entregableModel');
        if (dashboardController.entregableModel) {
            console.log('   ✓ entregableModel existe en DashboardController');
        } else {
            console.log('   ❌ entregableModel NO existe en DashboardController');
            throw new Error('entregableModel faltante en DashboardController');
        }
        
        // Test 3: Verificar que NO tiene referencias a deliverableModel
        console.log('\n✅ Test 3: Verificación de ausencia de referencias obsoletas');
        if (!dashboardController.deliverableModel) {
            console.log('   ✓ No hay referencias a deliverableModel (correcto)');
        } else {
            console.log('   ⚠️  Aún existe referencia a deliverableModel (debería eliminarse)');
        }
        
        // Test 4: Verificar que el modelo entregableModel tiene los métodos necesarios
        console.log('\n✅ Test 4: Verificación de métodos del entregableModel');
        const requiredMethods = [
            'findByProject',
            'findByStudent', 
            'findWithProject',
            'getKanbanData',
            'findById',
            'update'
        ];
        
        for (const method of requiredMethods) {
            if (typeof dashboardController.entregableModel[method] === 'function') {
                console.log(`   ✓ Método ${method} existe en entregableModel`);
            } else {
                console.log(`   ❌ Método ${method} NO existe en entregableModel`);
                throw new Error(`Método ${method} faltante en entregableModel`);
            }
        }
        
        // Test 5: Verificar métodos principales del DashboardController
        console.log('\n✅ Test 5: Verificación de métodos principales del controlador');
        const controllerMethods = [
            'studentDashboard',
            'coordinatorDashboard',
            'directorDashboard',
            'adminDashboard'
        ];
        
        for (const method of controllerMethods) {
            if (typeof dashboardController[method] === 'function') {
                console.log(`   ✓ Método ${method} existe en DashboardController`);
            } else {
                console.log(`   ❌ Método ${method} NO existe en DashboardController`);
                throw new Error(`Método ${method} faltante en DashboardController`);
            }
        }
        
        // Test 6: Verificar que otros modelos también existen
        console.log('\n✅ Test 6: Verificación de otros modelos necesarios');
        const otherModels = [
            { name: 'projectModel', property: 'projectModel' },
            { name: 'userModel', property: 'userModel' },
            { name: 'taskModel', property: 'taskModel' }
        ];
        
        for (const model of otherModels) {
            if (dashboardController[model.property]) {
                console.log(`   ✓ ${model.name} existe en DashboardController`);
            } else {
                console.log(`   ⚠️  ${model.name} NO existe en DashboardController (puede ser opcional)`);
            }
        }
        
        console.log('\n🎉 Todas las pruebas de DashboardController con entregableModel pasaron exitosamente!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas de DashboardController:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

// Ejecutar las pruebas
if (require.main === module) {
    testDashboardEntregable()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error inesperado:', error);
            process.exit(1);
        });
}

module.exports = testDashboardEntregable;