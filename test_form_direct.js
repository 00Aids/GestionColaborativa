// Usar fetch nativo de Node.js (disponible desde v18)
const FormData = require('form-data');

async function testFormSubmission() {
    console.log('🧪 Probando envío directo del formulario...\n');
    
    const baseUrl = 'http://localhost:3000';
    let cookies = '';
    
    try {
        // 1. Login primero
        console.log('🔐 Iniciando sesión...');
        const loginResponse = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: 'email=nuevoadmin@test.com&password=admin123',
            redirect: 'manual'
        });
        
        // Obtener cookies de sesión
        const setCookieHeader = loginResponse.headers.get('set-cookie');
        if (setCookieHeader) {
            cookies = setCookieHeader.split(',').map(cookie => cookie.split(';')[0]).join('; ');
            console.log('✅ Sesión iniciada correctamente');
        } else {
            console.log('❌ No se obtuvieron cookies de sesión');
            return;
        }
        
        // 2. Probar con application/x-www-form-urlencoded (como formulario normal)
        console.log('\n📝 Probando con application/x-www-form-urlencoded...');
        
        const formData = new URLSearchParams();
        formData.append('titulo', 'Tarea Test Direct');
        formData.append('descripcion', 'Descripción de prueba');
        formData.append('prioridad', 'media');
        formData.append('fase_id', '1');
        
        const response1 = await fetch(`${baseUrl}/admin/projects/35/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },
            body: formData.toString(),
            redirect: 'manual'
        });
        
        console.log(`📊 Status: ${response1.status}`);
        console.log(`📍 Location: ${response1.headers.get('location') || 'No redirect'}`);
        
        if (response1.status === 302) {
            console.log('✅ Redirección exitosa (probablemente tarea creada)');
        } else {
            const text1 = await response1.text();
            console.log('📄 Respuesta:', text1.substring(0, 500));
        }
        
        // 3. Probar con multipart/form-data (como está configurado el formulario)
        console.log('\n📝 Probando con multipart/form-data...');
        
        const form = new FormData();
        form.append('titulo', 'Tarea Test Multipart');
        form.append('descripcion', 'Descripción multipart');
        form.append('prioridad', 'alta');
        form.append('fase_id', '1');
        
        const response2 = await fetch(`${baseUrl}/admin/projects/35/tasks`, {
            method: 'POST',
            headers: {
                'Cookie': cookies,
                ...form.getHeaders()
            },
            body: form,
            redirect: 'manual'
        });
        
        console.log(`📊 Status: ${response2.status}`);
        console.log(`📍 Location: ${response2.headers.get('location') || 'No redirect'}`);
        
        if (response2.status === 302) {
            console.log('✅ Redirección exitosa (probablemente tarea creada)');
        } else {
            const text2 = await response2.text();
            console.log('📄 Respuesta:', text2.substring(0, 500));
        }
        
        // 4. Verificar en base de datos
        console.log('\n🔍 Verificando en base de datos...');
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gestion_colaborativa'
        });
        
        const [tasks] = await connection.execute(
            'SELECT id, titulo, descripcion, prioridad FROM entregables WHERE proyecto_id = 35 ORDER BY id DESC LIMIT 5'
        );
        
        console.log('📋 Últimas 5 tareas del proyecto 35:');
        tasks.forEach(task => {
            console.log(`   - ID: ${task.id}, Título: "${task.titulo}", Prioridad: ${task.prioridad}`);
        });
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

testFormSubmission();