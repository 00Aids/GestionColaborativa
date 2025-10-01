const fs = require('fs');
const path = require('path');

async function testRoutesUpdated() {
    console.log('🧪 Iniciando pruebas de rutas actualizadas...\n');
    
    try {
        // Test 1: Verificar que coordinator.js usa entregableController
        console.log('✅ Test 1: Verificación de coordinator.js');
        const coordinatorPath = path.join(__dirname, 'src', 'routes', 'coordinator.js');
        
        if (!fs.existsSync(coordinatorPath)) {
            throw new Error('Archivo coordinator.js no encontrado');
        }
        
        const coordinatorContent = fs.readFileSync(coordinatorPath, 'utf8');
        
        // Verificar que importa EntregableController
        if (coordinatorContent.includes('EntregableController')) {
            console.log('   ✓ coordinator.js importa EntregableController');
        } else {
            console.log('   ❌ coordinator.js NO importa EntregableController');
            throw new Error('coordinator.js no importa EntregableController');
        }
        
        // Verificar que usa entregableController
        if (coordinatorContent.includes('entregableController')) {
            console.log('   ✓ coordinator.js usa entregableController');
        } else {
            console.log('   ❌ coordinator.js NO usa entregableController');
            throw new Error('coordinator.js no usa entregableController');
        }
        
        // Verificar que NO tiene referencias a deliverableController
        if (!coordinatorContent.includes('deliverableController')) {
            console.log('   ✓ coordinator.js NO tiene referencias a deliverableController (correcto)');
        } else {
            console.log('   ⚠️  coordinator.js aún tiene referencias a deliverableController');
        }
        
        // Test 2: Verificar que director.js usa entregableController
        console.log('\n✅ Test 2: Verificación de director.js');
        const directorPath = path.join(__dirname, 'src', 'routes', 'director.js');
        
        if (!fs.existsSync(directorPath)) {
            throw new Error('Archivo director.js no encontrado');
        }
        
        const directorContent = fs.readFileSync(directorPath, 'utf8');
        
        // Verificar que importa EntregableController
        if (directorContent.includes('EntregableController')) {
            console.log('   ✓ director.js importa EntregableController');
        } else {
            console.log('   ❌ director.js NO importa EntregableController');
            throw new Error('director.js no importa EntregableController');
        }
        
        // Verificar que usa entregableController
        if (directorContent.includes('entregableController')) {
            console.log('   ✓ director.js usa entregableController');
        } else {
            console.log('   ❌ director.js NO usa entregableController');
            throw new Error('director.js no usa entregableController');
        }
        
        // Verificar que NO tiene referencias a deliverableController
        if (!directorContent.includes('deliverableController')) {
            console.log('   ✓ director.js NO tiene referencias a deliverableController (correcto)');
        } else {
            console.log('   ⚠️  director.js aún tiene referencias a deliverableController');
        }
        
        // Test 3: Verificar rutas específicas en coordinator.js
        console.log('\n✅ Test 3: Verificación de rutas específicas en coordinator.js');
        const coordinatorRoutes = [
            'entregableController.coordinatorReview',
            'entregableController.updateDeliverableStatus',
            'entregableController.getDeliverableDetails',
            'entregableController.addComment'
        ];
        
        for (const route of coordinatorRoutes) {
            if (coordinatorContent.includes(route)) {
                console.log(`   ✓ Ruta ${route} encontrada`);
            } else {
                console.log(`   ❌ Ruta ${route} NO encontrada`);
                throw new Error(`Ruta ${route} faltante en coordinator.js`);
            }
        }
        
        // Test 4: Verificar rutas específicas en director.js
        console.log('\n✅ Test 4: Verificación de rutas específicas en director.js');
        const directorRoutes = [
            'entregableController.getDeliverableById',
            'entregableController.updateStatus',
            'entregableController.addComment'
        ];
        
        for (const route of directorRoutes) {
            if (directorContent.includes(route)) {
                console.log(`   ✓ Ruta ${route} encontrada`);
            } else {
                console.log(`   ❌ Ruta ${route} NO encontrada`);
                throw new Error(`Ruta ${route} faltante en director.js`);
            }
        }
        
        // Test 5: Verificar sintaxis de archivos de rutas
        console.log('\n✅ Test 5: Verificación de sintaxis de archivos de rutas');
        
        try {
            // Intentar requerir los archivos para verificar sintaxis
            delete require.cache[require.resolve('./src/routes/coordinator.js')];
            delete require.cache[require.resolve('./src/routes/director.js')];
            
            require('./src/routes/coordinator.js');
            console.log('   ✓ coordinator.js tiene sintaxis válida');
            
            require('./src/routes/director.js');
            console.log('   ✓ director.js tiene sintaxis válida');
            
        } catch (syntaxError) {
            console.log('   ❌ Error de sintaxis en archivos de rutas');
            throw new Error(`Error de sintaxis: ${syntaxError.message}`);
        }
        
        console.log('\n🎉 Todas las pruebas de rutas actualizadas pasaron exitosamente!');
        return true;
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas de rutas actualizadas:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

// Ejecutar las pruebas
if (require.main === module) {
    testRoutesUpdated()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error inesperado:', error);
            process.exit(1);
        });
}

module.exports = testRoutesUpdated;