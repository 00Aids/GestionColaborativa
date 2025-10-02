const mysql = require('mysql2/promise');
require('dotenv').config();

// Función para hacer peticiones HTTP usando fetch nativo
async function makeRequest(url, options = {}) {
    const response = await fetch(url, {
        redirect: 'manual',
        ...options
    });
    
    return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        data: response.headers.get('content-type')?.includes('application/json') 
            ? await response.json() 
            : await response.text()
    };
}

async function testFormSubmission() {
    console.log('🔍 Probando envío del formulario de creación de tareas...\n');
    
    try {
        // 1. Configurar conexión a la base de datos
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_academica'
        });
        
        console.log('✅ Conexión a la base de datos establecida');
        
        // 2. Contar tareas antes del envío
        const [beforeRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM entregables WHERE proyecto_id = 35'
        );
        const tasksBefore = beforeRows[0].count;
        console.log(`📊 Tareas en proyecto 35 antes: ${tasksBefore}`);
        
        // 3. Hacer login para obtener cookies de sesión
        console.log('\n🔐 Iniciando sesión...');
        const loginResponse = await makeRequest('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                email: 'nuevoadmin@test.com',
                password: 'admin123'
            })
        });
        
        const cookies = loginResponse.headers['set-cookie'];
        console.log(`✅ Login exitoso (${loginResponse.status})`);
        
        // 4. Acceder al formulario de creación
        console.log('\n📝 Accediendo al formulario de creación...');
        const formResponse = await makeRequest('http://localhost:3000/admin/projects/35/tasks/new', {
            headers: {
                'Cookie': cookies || ''
            }
        });
        console.log(`✅ Formulario cargado (${formResponse.status})`);
        
        // 5. Enviar formulario con datos de prueba
        console.log('\n📤 Enviando formulario...');
        const formData = new URLSearchParams({
            titulo: 'Tarea Debug Form',
            descripcion: 'Tarea creada para debuggear el formulario',
            prioridad: 'medium',
            fase_id: '1',
            asignado_a: '',
            fecha_limite: '2024-12-31',
            estimacion_horas: '2',
            etiquetas: 'debug, test',
            estado_workflow: 'todo'
        });
        
        const submitResponse = await makeRequest('http://localhost:3000/admin/projects/35/tasks', {
            method: 'POST',
            headers: {
                'Cookie': cookies || '',
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData
        });
        
        console.log(`📤 Respuesta del formulario: ${submitResponse.status}`);
        console.log(`📍 Redirección a: ${submitResponse.headers.location || 'No hay redirección'}`);
        
        // 6. Verificar si se creó la tarea en la base de datos
        console.log('\n🔍 Verificando en la base de datos...');
        await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
        
        const [afterRows] = await connection.execute(
            'SELECT COUNT(*) as count FROM entregables WHERE proyecto_id = 35'
        );
        const tasksAfter = afterRows[0].count;
        console.log(`📊 Tareas en proyecto 35 después: ${tasksAfter}`);
        
        // 7. Buscar la tarea específica
        const [taskRows] = await connection.execute(
            'SELECT * FROM entregables WHERE proyecto_id = 35 AND titulo = ? ORDER BY id DESC LIMIT 1',
            ['Tarea Debug Form']
        );
        
        if (taskRows.length > 0) {
            console.log('✅ Tarea encontrada en la base de datos:');
            console.log(`   ID: ${taskRows[0].id}`);
            console.log(`   Título: ${taskRows[0].titulo}`);
            console.log(`   Estado: ${taskRows[0].estado}`);
            console.log(`   Estado Workflow: ${taskRows[0].estado_workflow}`);
            console.log(`   Fecha creación: ${taskRows[0].created_at}`);
        } else {
            console.log('❌ Tarea NO encontrada en la base de datos');
        }
        
        // 8. Probar la API de tareas del Kanban
        console.log('\n🔄 Probando API de tareas del Kanban...');
        const apiResponse = await makeRequest('http://localhost:3000/admin/api/projects/35/tasks', {
            headers: {
                'Cookie': cookies || ''
            }
        });
        
        console.log(`✅ API respuesta: ${apiResponse.status}`);
        const kanbanData = apiResponse.data;
        
        if (kanbanData && kanbanData.success) {
            console.log('📊 Datos del Kanban:');
            console.log(`   Todo: ${kanbanData.data.todo?.length || 0} tareas`);
            console.log(`   In Progress: ${kanbanData.data.in_progress?.length || 0} tareas`);
            console.log(`   Done: ${kanbanData.data.done?.length || 0} tareas`);
            
            // Buscar nuestra tarea en los datos del Kanban
            const allTasks = [
                ...(kanbanData.data.todo || []),
                ...(kanbanData.data.in_progress || []),
                ...(kanbanData.data.done || [])
            ];
            
            const ourTask = allTasks.find(task => task.titulo === 'Tarea Debug Form');
            if (ourTask) {
                console.log('✅ Tarea encontrada en datos del Kanban');
            } else {
                console.log('❌ Tarea NO encontrada en datos del Kanban');
            }
        }
        
        await connection.end();
        console.log('\n🏁 Prueba completada');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error('Stack:', error.stack);
    }
}

testFormSubmission();