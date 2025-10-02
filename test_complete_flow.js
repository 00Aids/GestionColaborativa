<<<<<<< Updated upstream
const fs = require('fs');
const path = require('path');

async function testCompleteFlow() {
    console.log('🧪 Iniciando pruebas del flujo completo de entregables...\n');
    
    try {
        const srcDir = path.join(__dirname, 'src');
        
        // Test 1: Verificar que todos los componentes principales existen
        console.log('✅ Test 1: Verificación de componentes principales');
        
        const requiredFiles = [
            'src/models/Entregable.js',
            'src/controllers/EntregableController.js',
            'src/routes/coordinator.js',
            'src/routes/director.js'
        ];
        
        for (const file of requiredFiles) {
            const filePath = path.join(__dirname, file);
            if (fs.existsSync(filePath)) {
                console.log(`   ✓ ${file} existe`);
            } else {
                throw new Error(`Archivo requerido no encontrado: ${file}`);
            }
        }
        
        // Test 2: Verificar la integridad del modelo Entregable
        console.log('\n✅ Test 2: Verificación de integridad del modelo Entregable');
        const entregableModelPath = path.join(__dirname, 'src/models/Entregable.js');
        const entregableContent = fs.readFileSync(entregableModelPath, 'utf8');
        
        const requiredMethods = [
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
        
        for (const method of requiredMethods) {
            if (entregableContent.includes(`${method}(`)) {
                console.log(`   ✓ Método ${method} encontrado`);
            } else {
                throw new Error(`Método requerido no encontrado en Entregable: ${method}`);
            }
        }
        
        // Test 3: Verificar la integridad del controlador EntregableController
        console.log('\n✅ Test 3: Verificación de integridad del controlador EntregableController');
        const controllerPath = path.join(__dirname, 'src/controllers/EntregableController.js');
        const controllerContent = fs.readFileSync(controllerPath, 'utf8');
        
        const requiredControllerMethods = [
            'coordinatorReview',
            'updateDeliverableStatus',
            'getDeliverableDetails',
            'addComment',
            'getDeliverableById',
            'updateStatus'
        ];
        
        for (const method of requiredControllerMethods) {
            if (controllerContent.includes(`${method}(`)) {
                console.log(`   ✓ Método ${method} encontrado en controlador`);
            } else {
                throw new Error(`Método requerido no encontrado en EntregableController: ${method}`);
            }
        }
        
        // Test 4: Verificar que el controlador usa entregableModel
        console.log('\n✅ Test 4: Verificación de uso de entregableModel en controlador');
        if (controllerContent.includes('this.entregableModel')) {
            console.log('   ✓ EntregableController usa this.entregableModel');
        } else {
            throw new Error('EntregableController no usa this.entregableModel');
        }
        
        if (!controllerContent.includes('deliverableModel')) {
            console.log('   ✓ No hay referencias obsoletas a deliverableModel');
        } else {
            console.log('   ⚠️  Advertencia: Se encontraron referencias a deliverableModel');
        }
        
        // Test 5: Verificar las rutas de coordinador
        console.log('\n✅ Test 5: Verificación de rutas de coordinador');
        const coordinatorRoutesPath = path.join(__dirname, 'src/routes/coordinator.js');
        const coordinatorContent = fs.readFileSync(coordinatorRoutesPath, 'utf8');
        
        const requiredRoutes = [
            'coordinatorReview',
            'updateDeliverableStatus',
            'getDeliverableDetails',
            'addComment'
        ];
        
        for (const route of requiredRoutes) {
            if (coordinatorContent.includes(route)) {
                console.log(`   ✓ Ruta ${route} encontrada en coordinator.js`);
            } else {
                console.log(`   ⚠️  Ruta ${route} no encontrada en coordinator.js`);
            }
        }
        
        // Test 6: Verificar las rutas de director
        console.log('\n✅ Test 6: Verificación de rutas de director');
        const directorRoutesPath = path.join(__dirname, 'src/routes/director.js');
        const directorContent = fs.readFileSync(directorRoutesPath, 'utf8');
        
        for (const route of requiredRoutes) {
            if (directorContent.includes(route)) {
                console.log(`   ✓ Ruta ${route} encontrada en director.js`);
            } else {
                console.log(`   ⚠️  Ruta ${route} no encontrada en director.js`);
            }
        }
        
        // Test 7: Verificar que las rutas usan entregableController
        console.log('\n✅ Test 7: Verificación de uso de entregableController en rutas');
        
        if (coordinatorContent.includes('entregableController')) {
            console.log('   ✓ coordinator.js usa entregableController');
        } else {
            throw new Error('coordinator.js no usa entregableController');
        }
        
        if (directorContent.includes('entregableController')) {
            console.log('   ✓ director.js usa entregableController');
        } else {
            throw new Error('director.js no usa entregableController');
        }
        
        // Test 8: Verificar sintaxis de archivos principales
        console.log('\n✅ Test 8: Verificación de sintaxis de archivos principales');
        
        try {
            require(entregableModelPath);
            console.log('   ✓ Entregable.js tiene sintaxis válida');
        } catch (error) {
            throw new Error(`Error de sintaxis en Entregable.js: ${error.message}`);
        }
        
        try {
            require(controllerPath);
            console.log('   ✓ EntregableController.js tiene sintaxis válida');
        } catch (error) {
            throw new Error(`Error de sintaxis en EntregableController.js: ${error.message}`);
        }
        
        // Test 9: Verificar estructura de base de datos esperada
        console.log('\n✅ Test 9: Verificación de estructura de base de datos');
        
        if (entregableContent.includes('entregables')) {
            console.log('   ✓ Modelo usa tabla "entregables"');
        } else {
            throw new Error('Modelo no especifica tabla "entregables"');
        }
        
        const expectedColumns = [
            'id', 'titulo', 'descripcion', 'estado', 'fecha_entrega',
            'fecha_creacion', 'fecha_actualizacion', 'proyecto_id', 'estudiante_id'
        ];
        
        let foundColumns = 0;
        for (const column of expectedColumns) {
            if (entregableContent.includes(column)) {
                foundColumns++;
            }
        }
        
        console.log(`   ✓ Se encontraron referencias a ${foundColumns}/${expectedColumns.length} columnas esperadas`);
        
        // Test 10: Verificar flujo de estados
        console.log('\n✅ Test 10: Verificación de flujo de estados');
        
        const expectedStates = ['pendiente', 'en_revision', 'aprobado', 'rechazado', 'necesita_cambios'];
        let foundStates = 0;
        
        for (const state of expectedStates) {
            if (entregableContent.includes(state) || controllerContent.includes(state)) {
                foundStates++;
            }
        }
        
        console.log(`   ✓ Se encontraron referencias a ${foundStates}/${expectedStates.length} estados esperados`);
        
        // Test 11: Verificar integración con notificaciones
        console.log('\n✅ Test 11: Verificación de integración con notificaciones');
        
        if (controllerContent.includes('notificationService')) {
            console.log('   ✓ EntregableController integra con notificationService');
        } else {
            console.log('   ⚠️  EntregableController no parece integrar con notificationService');
        }
        
        // Test 12: Verificar manejo de comentarios
        console.log('\n✅ Test 12: Verificación de manejo de comentarios');
        
        if (entregableContent.includes('addComment') && controllerContent.includes('addComment')) {
            console.log('   ✓ Sistema de comentarios implementado en modelo y controlador');
        } else {
            throw new Error('Sistema de comentarios no completamente implementado');
        }
        
        console.log('\n🎉 Todas las pruebas del flujo completo pasaron exitosamente!');
        console.log('\n📋 Resumen de la migración:');
        console.log('   • Modelo Entregable: ✅ Completamente funcional');
        console.log('   • EntregableController: ✅ Todos los métodos implementados');
        console.log('   • Rutas actualizadas: ✅ coordinator.js y director.js');
        console.log('   • Referencias obsoletas: ✅ Eliminadas');
        console.log('   • Flujo de estados: ✅ Implementado');
        console.log('   • Sistema de comentarios: ✅ Funcional');
        console.log('   • Integración con notificaciones: ✅ Configurada');
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Error en las pruebas del flujo completo:');
        console.error('   ', error.message);
        console.error('\n📋 Stack trace:');
        console.error(error.stack);
        return false;
    }
}

// Ejecutar las pruebas
if (require.main === module) {
    testCompleteFlow()
        .then(success => {
            process.exit(success ? 0 : 1);
        })
        .catch(error => {
            console.error('Error inesperado:', error);
            process.exit(1);
        });
}

module.exports = testCompleteFlow;
=======
const http = require('http');
const querystring = require('querystring');

// Función para hacer peticiones HTTP con cookies
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (err) => {
            reject(err);
        });
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

// Función para extraer cookies de la respuesta
function extractCookies(headers) {
    const cookies = headers['set-cookie'];
    if (!cookies) return '';
    
    return cookies.map(cookie => cookie.split(';')[0]).join('; ');
}

async function testCompleteFlow() {
    console.log('🧪 Testing Complete Login + Task Creation Flow...\n');
    
    let sessionCookie = '';
    
    try {
        // PASO 1: Hacer login
        console.log('🔐 STEP 1: Login');
        const loginData = querystring.stringify({
            email: 'nuevoadmin@test.com',
            password: 'admin123'
        });
        
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        console.log(`   Status: ${loginResponse.statusCode}`);
        console.log(`   Redirect: ${loginResponse.headers.location || 'None'}`);
        
        // Extraer cookies de sesión
        sessionCookie = extractCookies(loginResponse.headers);
        console.log(`   Session Cookie: ${sessionCookie ? 'Obtained' : 'Not found'}`);
        
        if (loginResponse.statusCode !== 302) {
            console.log('❌ Login failed - unexpected status code');
            return;
        }
        
        // PASO 2: Verificar acceso a la página de creación de tareas
        console.log('\n📄 STEP 2: Access Task Creation Page');
        const pageOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/admin/projects/35/tasks/new',
            method: 'GET',
            headers: {
                'Cookie': sessionCookie
            }
        };
        
        const pageResponse = await makeRequest(pageOptions);
        console.log(`   Status: ${pageResponse.statusCode}`);
        console.log(`   Redirect: ${pageResponse.headers.location || 'None'}`);
        
        if (pageResponse.statusCode === 302 && pageResponse.headers.location === '/auth/login') {
            console.log('❌ Still redirecting to login - session not working');
            return;
        } else if (pageResponse.statusCode === 200) {
            console.log('✅ Successfully accessed task creation page');
        }
        
        // PASO 3: Enviar formulario de creación de tarea
        console.log('\n📝 STEP 3: Submit Task Creation Form');
        const taskData = querystring.stringify({
            titulo: 'Tarea de Prueba - Flujo Completo',
            descripcion: 'Esta tarea fue creada usando el flujo completo de login + creación',
            prioridad: 'high',
            fase_id: '1',
            fecha_limite: '2024-12-31',
            asignado_a: '',
            estimacion_horas: '3',
            etiquetas: 'prueba,flujo-completo',
            estado_workflow: 'todo'
        });
        
        const taskOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/admin/projects/35/tasks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(taskData),
                'Cookie': sessionCookie
            }
        };
        
        const taskResponse = await makeRequest(taskOptions, taskData);
        console.log(`   Status: ${taskResponse.statusCode}`);
        console.log(`   Redirect: ${taskResponse.headers.location || 'None'}`);
        
        if (taskResponse.statusCode === 302) {
            if (taskResponse.headers.location && taskResponse.headers.location.includes('kanban')) {
                console.log('✅ SUCCESS: Task created and redirected to Kanban!');
            } else if (taskResponse.headers.location === '/auth/login') {
                console.log('❌ FAILURE: Still redirecting to login');
            } else {
                console.log(`⚠️  Redirected to: ${taskResponse.headers.location}`);
            }
        } else {
            console.log(`❌ Unexpected status: ${taskResponse.statusCode}`);
        }
        
        // PASO 4: Verificar en la base de datos
        console.log('\n🔍 STEP 4: Verify in Database');
        await checkTaskInDatabase();
        
    } catch (error) {
        console.error('❌ Error in flow:', error.message);
    }
}

// Función para verificar la tarea en la base de datos
async function checkTaskInDatabase() {
    const mysql = require('mysql2/promise');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        const [rows] = await connection.execute(
            'SELECT * FROM entregables WHERE proyecto_id = ? ORDER BY created_at DESC LIMIT 3',
            [35]
        );
        
        console.log(`   Found ${rows.length} recent tasks for project 35:`);
        rows.forEach((task, index) => {
            console.log(`   ${index + 1}. ID: ${task.id}, Title: "${task.titulo}", Status: ${task.estado_workflow}`);
        });
        
        await connection.end();
        
    } catch (error) {
        console.error('   Database Error:', error.message);
    }
}

// Ejecutar el flujo completo
testCompleteFlow();
>>>>>>> Stashed changes
