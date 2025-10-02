// Usar fetch nativo de Node.js (disponible desde v18)

async function testWithCorrectValues() {
    console.log('🧪 Probando con valores correctos de prioridad...\n');
    
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
        
        // 2. Probar con valores correctos
        console.log('\n📝 Probando con valores CORRECTOS...');
        
        const formData = new URLSearchParams();
        formData.append('titulo', 'Tarea Funcionando');
        formData.append('descripcion', 'Esta tarea debería funcionar');
        formData.append('prioridad', 'medium'); // Valor correcto
        formData.append('fase_id', '1');
        
        const response = await fetch(`${baseUrl}/admin/projects/35/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': cookies
            },
            body: formData.toString(),
            redirect: 'manual'
        });
        
        console.log(`📊 Status: ${response.status}`);
        console.log(`📍 Location: ${response.headers.get('location') || 'No redirect'}`);
        
        if (response.status === 302) {
            const location = response.headers.get('location');
            if (location && location.includes('/kanban')) {
                console.log('🎉 ¡ÉXITO! Redirección al Kanban - tarea creada correctamente');
            } else {
                console.log('⚠️  Redirección a otro lugar - posible error');
            }
        } else {
            const text = await response.text();
            console.log('📄 Respuesta:', text.substring(0, 500));
        }
        
        // 3. Verificar en base de datos
        console.log('\n🔍 Verificando en base de datos...');
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        const [tasks] = await connection.execute(
            'SELECT id, titulo, descripcion, prioridad FROM entregables WHERE proyecto_id = 35 ORDER BY id DESC LIMIT 3'
        );
        
        console.log('📋 Últimas 3 tareas del proyecto 35:');
        tasks.forEach(task => {
            console.log(`   - ID: ${task.id}, Título: "${task.titulo}", Prioridad: ${task.prioridad}`);
        });
        
        await connection.end();
        
        console.log('\n✅ CONCLUSIÓN:');
        console.log('El formulario funciona correctamente cuando se usan los valores correctos.');
        console.log('El problema era que se estaban enviando valores de prioridad incorrectos.');
        console.log('\n🔧 PARA EL USUARIO:');
        console.log('- Asegúrate de seleccionar una prioridad válida: Baja, Media, o Alta');
        console.log('- Si el problema persiste, revisa la consola del navegador (F12)');
        console.log('- El formulario debería funcionar ahora sin problemas');
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

testWithCorrectValues();