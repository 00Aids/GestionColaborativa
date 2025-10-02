const http = require('http');

function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });
        
        req.on('error', (error) => {
            reject(error);
        });
        
        if (postData) {
            req.write(postData);
        }
        
        req.end();
    });
}

async function testTaskCreationAPI() {
    console.log('=== PROBANDO API DE CREACIÓN DE TAREAS ===');
    
    try {
        // Primero, intentar hacer login para obtener una sesión válida
        console.log('1. Intentando hacer login...');
        
        const loginData = JSON.stringify({
            email: 'nuevoadmin@test.com',
            password: 'admin123'
        });
        
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        console.log('Login response status:', loginResponse.status);
        
        if (loginResponse.status !== 200 && loginResponse.status !== 302) {
            console.error('Error en login:', loginResponse.body);
            return;
        }
        
        // Obtener cookies de sesión
        const cookies = loginResponse.headers['set-cookie'];
        console.log('Cookies obtenidas:', cookies ? 'Sí' : 'No');
        
        // Ahora probar la creación de tarea
        console.log('\n2. Probando creación de tarea...');
        
        const taskData = {
            titulo: 'Tarea de Prueba API',
            descripcion: 'Esta es una tarea creada desde el test de API',
            proyecto_id: 29,
            fase_id: 1,
            fecha_limite: '2024-12-31',
            estado: 'pendiente',
            prioridad: 'medium'
        };
        
        console.log('Datos de tarea a enviar:', taskData);
        
        const taskDataString = JSON.stringify(taskData);
        
        const createOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/dashboard/api/tasks',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(taskDataString),
                'Cookie': cookies ? cookies.join('; ') : ''
            }
        };
        
        const createResponse = await makeRequest(createOptions, taskDataString);
        console.log('Create task response status:', createResponse.status);
        console.log('Response body:', createResponse.body);
        
        if (createResponse.status === 200) {
            const responseData = JSON.parse(createResponse.body);
            console.log('\n✅ TAREA CREADA EXITOSAMENTE');
            console.log('Respuesta:', responseData);
        } else {
            console.log('\n❌ ERROR AL CREAR TAREA');
            console.log('Status:', createResponse.status);
            console.log('Response:', createResponse.body);
        }
        
    } catch (error) {
        console.error('\n❌ ERROR EN LA PRUEBA:', error.message);
        console.error('Stack:', error.stack);
    }
}

// Ejecutar la prueba
testTaskCreationAPI();