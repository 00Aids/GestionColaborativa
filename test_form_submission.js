const http = require('http');
const querystring = require('querystring');

// Simular el envío del formulario de creación de tareas
async function testTaskFormSubmission() {
    console.log('🧪 Testing Task Form Submission...\n');
    
    // Datos del formulario como los enviaría el navegador
    const formData = {
        titulo: 'Tarea de Prueba desde Formulario',
        descripcion: 'Esta es una tarea creada para probar el formulario web',
        prioridad: 'high',
        fase_id: '1',
        fecha_limite: '2024-12-31',
        asignado_a: '',
        estimacion_horas: '5',
        etiquetas: 'prueba,formulario',
        estado_workflow: 'todo'
    };
    
    const postData = querystring.stringify(formData);
    
    // Configuración de la petición POST
    const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/admin/projects/35/tasks',
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(postData),
            'Cookie': 'connect.sid=test-session' // Simular sesión
        }
    };
    
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            console.log(`📊 Status Code: ${res.statusCode}`);
            console.log(`📍 Headers:`, res.headers);
            
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                console.log(`📝 Response Length: ${data.length} characters`);
                
                // Analizar la respuesta
                if (res.statusCode === 302) {
                    console.log(`🔄 Redirect to: ${res.headers.location}`);
                    if (res.headers.location && res.headers.location.includes('kanban')) {
                        console.log('✅ SUCCESS: Redirected to Kanban (task likely created)');
                    } else {
                        console.log('⚠️  WARNING: Redirected but not to Kanban');
                    }
                } else if (res.statusCode === 200) {
                    console.log('📄 Form returned 200 (might be showing form again with errors)');
                } else {
                    console.log(`❌ Unexpected status code: ${res.statusCode}`);
                }
                
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    data: data
                });
            });
        });
        
        req.on('error', (err) => {
            console.error('❌ Request Error:', err.message);
            reject(err);
        });
        
        // Enviar los datos del formulario
        req.write(postData);
        req.end();
    });
}

// Función para verificar si la tarea se creó en la base de datos
async function checkTaskInDatabase() {
    console.log('\n🔍 Checking if task was created in database...');
    
    const mysql = require('mysql2/promise');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gestion_colaborativa'
        });
        
        const [rows] = await connection.execute(
            'SELECT * FROM tareas WHERE proyecto_id = ? ORDER BY created_at DESC LIMIT 5',
            [35]
        );
        
        console.log(`📊 Found ${rows.length} recent tasks for project 35:`);
        rows.forEach((task, index) => {
            console.log(`${index + 1}. ID: ${task.id}, Title: "${task.titulo}", Status: ${task.estado_workflow}, Created: ${task.created_at}`);
        });
        
        await connection.end();
        
        return rows;
    } catch (error) {
        console.error('❌ Database Error:', error.message);
        return [];
    }
}

// Ejecutar las pruebas
async function runTests() {
    try {
        // Verificar tareas antes del envío
        console.log('📋 BEFORE FORM SUBMISSION:');
        const tasksBefore = await checkTaskInDatabase();
        
        // Simular envío del formulario
        console.log('\n📤 FORM SUBMISSION:');
        const response = await testTaskFormSubmission();
        
        // Esperar un momento para que se procese
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Verificar tareas después del envío
        console.log('\n📋 AFTER FORM SUBMISSION:');
        const tasksAfter = await checkTaskInDatabase();
        
        // Comparar resultados
        console.log('\n📊 COMPARISON:');
        console.log(`Tasks before: ${tasksBefore.length}`);
        console.log(`Tasks after: ${tasksAfter.length}`);
        
        if (tasksAfter.length > tasksBefore.length) {
            console.log('✅ SUCCESS: New task was created!');
            const newTask = tasksAfter[0];
            console.log(`📝 New task: ID ${newTask.id}, Title: "${newTask.titulo}"`);
        } else {
            console.log('❌ FAILURE: No new task was created');
            console.log('🔍 This suggests there might be an issue with:');
            console.log('   - Session authentication');
            console.log('   - Form validation');
            console.log('   - Database connection');
            console.log('   - Server-side processing');
        }
        
    } catch (error) {
        console.error('❌ Test Error:', error);
    }
}

// Ejecutar
runTests();