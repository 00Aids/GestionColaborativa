const path = require('path');
const fs = require('fs');

// Configurar el entorno de prueba
process.env.NODE_ENV = 'test';

console.log('🎓 Iniciando pruebas del flujo de entregas de estudiantes...\n');

// Test 1: Verificar que existe el controlador de estudiantes
console.log('👨‍🎓 Test 1: Verificando controlador de estudiantes');
try {
    const studentControllerPath = path.join(__dirname, 'src', 'controllers', 'StudentController.js');
    
    if (fs.existsSync(studentControllerPath)) {
        console.log('✅ StudentController encontrado');
        
        const studentContent = fs.readFileSync(studentControllerPath, 'utf8');
        
        // Verificar métodos relacionados con entregables
        const expectedMethods = [
            'submitDeliverable',
            'getMyDeliverables', 
            'updateDeliverable',
            'viewDeliverable'
        ];
        
        expectedMethods.forEach(method => {
            if (studentContent.includes(method)) {
                console.log(`✅ Método ${method} encontrado`);
            } else {
                console.log(`⚠️  Método ${method} no encontrado`);
            }
        });
        
        // Verificar uso de entregableModel
        if (studentContent.includes('entregableModel') || studentContent.includes('Entregable')) {
            console.log('✅ StudentController usa modelo de entregables');
        } else {
            console.log('❌ StudentController NO usa modelo de entregables');
        }
    } else {
        console.log('❌ StudentController no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar StudentController:', error.message);
}

// Test 2: Verificar rutas de estudiantes
console.log('\n🛣️  Test 2: Verificando rutas de estudiantes');
try {
    const studentRoutesPath = path.join(__dirname, 'src', 'routes', 'student.js');
    
    if (fs.existsSync(studentRoutesPath)) {
        console.log('✅ Rutas de estudiantes encontradas');
        
        const routesContent = fs.readFileSync(studentRoutesPath, 'utf8');
        
        // Verificar rutas específicas de entregables
        const expectedRoutes = [
            'deliverable',
            'entregable',
            'submit',
            'upload'
        ];
        
        expectedRoutes.forEach(route => {
            if (routesContent.includes(route)) {
                console.log(`✅ Ruta relacionada con '${route}' encontrada`);
            } else {
                console.log(`⚠️  Ruta relacionada con '${route}' no encontrada`);
            }
        });
        
        // Verificar uso del controlador correcto
        if (routesContent.includes('studentController') || routesContent.includes('StudentController')) {
            console.log('✅ Rutas usan StudentController');
        } else {
            console.log('❌ Rutas NO usan StudentController');
        }
    } else {
        console.log('❌ Rutas de estudiantes no encontradas');
    }
} catch (error) {
    console.log('❌ Error al verificar rutas de estudiantes:', error.message);
}

// Test 3: Verificar vistas de estudiantes para entregables
console.log('\n🎨 Test 3: Verificando vistas de estudiantes para entregables');
try {
    const studentViewsPath = path.join(__dirname, 'src', 'views', 'student');
    
    if (fs.existsSync(studentViewsPath)) {
        console.log('✅ Directorio de vistas de estudiantes encontrado');
        
        const viewFiles = fs.readdirSync(studentViewsPath);
        console.log(`📁 Archivos de vista encontrados: ${viewFiles.length}`);
        
        // Buscar vistas relacionadas con entregables
        const deliverableViews = viewFiles.filter(file => 
            file.includes('deliverable') || 
            file.includes('entregable') || 
            file.includes('submit') ||
            file.includes('dashboard')
        );
        
        if (deliverableViews.length > 0) {
            console.log(`✅ ${deliverableViews.length} vistas relacionadas con entregables encontradas:`);
            deliverableViews.forEach(view => console.log(`   - ${view}`));
        } else {
            console.log('⚠️  No se encontraron vistas específicas de entregables');
        }
        
        // Verificar dashboard de estudiante
        const dashboardPath = path.join(studentViewsPath, 'dashboard.ejs');
        if (fs.existsSync(dashboardPath)) {
            console.log('✅ Dashboard de estudiante encontrado');
            
            const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
            if (dashboardContent.includes('entregable') || dashboardContent.includes('deliverable')) {
                console.log('✅ Dashboard incluye funcionalidad de entregables');
            } else {
                console.log('⚠️  Dashboard no incluye funcionalidad de entregables');
            }
        } else {
            console.log('⚠️  Dashboard de estudiante no encontrado');
        }
    } else {
        console.log('❌ Directorio de vistas de estudiantes no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar vistas de estudiantes:', error.message);
}

// Test 4: Verificar funcionalidades del modelo Entregable para estudiantes
console.log('\n📚 Test 4: Verificando funcionalidades del modelo para estudiantes');
try {
    const Entregable = require('./src/models/Entregable');
    
    // Verificar métodos necesarios para estudiantes
    const studentMethods = [
        'findByStudent',
        'findByProject', 
        'create',
        'update',
        'findById'
    ];
    
    studentMethods.forEach(method => {
        if (typeof Entregable.prototype[method] === 'function' || typeof Entregable[method] === 'function') {
            console.log(`✅ Método ${method} disponible`);
        } else {
            console.log(`❌ Método ${method} NO disponible`);
        }
    });
    
    console.log('✅ Modelo Entregable cargado correctamente para estudiantes');
} catch (error) {
    console.log('❌ Error al verificar modelo Entregable:', error.message);
}

// Test 5: Verificar middleware de autenticación para estudiantes
console.log('\n🔐 Test 5: Verificando middleware de autenticación');
try {
    const middlewarePath = path.join(__dirname, 'src', 'middleware');
    
    if (fs.existsSync(middlewarePath)) {
        const middlewareFiles = fs.readdirSync(middlewarePath);
        
        const authFiles = middlewareFiles.filter(file => 
            file.includes('auth') || 
            file.includes('student') ||
            file.includes('role')
        );
        
        if (authFiles.length > 0) {
            console.log(`✅ ${authFiles.length} archivos de middleware de autenticación encontrados:`);
            authFiles.forEach(file => console.log(`   - ${file}`));
        } else {
            console.log('⚠️  No se encontraron archivos específicos de middleware de autenticación');
        }
    } else {
        console.log('❌ Directorio de middleware no encontrado');
    }
} catch (error) {
    console.log('❌ Error al verificar middleware:', error.message);
}

// Test 6: Verificar sistema de archivos/uploads para entregables
console.log('\n📁 Test 6: Verificando sistema de archivos para entregables');
try {
    const uploadsPath = path.join(__dirname, 'uploads');
    const publicPath = path.join(__dirname, 'public', 'uploads');
    
    if (fs.existsSync(uploadsPath)) {
        console.log('✅ Directorio uploads encontrado');
    } else if (fs.existsSync(publicPath)) {
        console.log('✅ Directorio public/uploads encontrado');
    } else {
        console.log('⚠️  Directorio de uploads no encontrado');
    }
    
    // Verificar configuración de multer o similar
    const configPath = path.join(__dirname, 'src', 'config');
    if (fs.existsSync(configPath)) {
        const configFiles = fs.readdirSync(configPath);
        const uploadConfig = configFiles.filter(file => 
            file.includes('upload') || 
            file.includes('multer') ||
            file.includes('storage')
        );
        
        if (uploadConfig.length > 0) {
            console.log(`✅ Configuración de uploads encontrada: ${uploadConfig.join(', ')}`);
        } else {
            console.log('⚠️  Configuración específica de uploads no encontrada');
        }
    }
} catch (error) {
    console.log('❌ Error al verificar sistema de archivos:', error.message);
}

// Test 7: Verificar flujo de estados para estudiantes
console.log('\n🔄 Test 7: Verificando flujo de estados para estudiantes');
try {
    const entregablePath = path.join(__dirname, 'src', 'models', 'Entregable.js');
    
    if (fs.existsSync(entregablePath)) {
        const entregableContent = fs.readFileSync(entregablePath, 'utf8');
        
        // Estados que un estudiante puede manejar
        const studentStates = ['pendiente', 'en_progreso', 'entregado'];
        
        studentStates.forEach(state => {
            if (entregableContent.includes(state)) {
                console.log(`✅ Estado '${state}' disponible para estudiantes`);
            } else {
                console.log(`⚠️  Estado '${state}' no encontrado`);
            }
        });
        
        // Verificar método de actualización de estado
        if (entregableContent.includes('updateStatus') || entregableContent.includes('updateStatusWithWorkflow')) {
            console.log('✅ Método de actualización de estado disponible');
        } else {
            console.log('❌ Método de actualización de estado NO disponible');
        }
    }
} catch (error) {
    console.log('❌ Error al verificar flujo de estados:', error.message);
}

console.log('\n🎯 Resumen de pruebas del flujo de entregas de estudiantes:');
console.log('- StudentController con métodos de entregables');
console.log('- Rutas de estudiantes configuradas');
console.log('- Vistas de estudiantes para entregables');
console.log('- Modelo Entregable con funcionalidades para estudiantes');
console.log('- Middleware de autenticación');
console.log('- Sistema de archivos/uploads');
console.log('- Flujo de estados para estudiantes');

console.log('\n✅ Pruebas del flujo de entregas de estudiantes completadas');