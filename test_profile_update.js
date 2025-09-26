const fetch = require('node-fetch');

async function testProfileUpdate() {
    console.log('🧪 Probando actualización de perfil...');
    
    try {
        // Simular datos del formulario
        const formData = new URLSearchParams({
            nombres: 'Juan Carlos',
            apellidos: 'Pérez García',
            email: 'estudiante1@test.com',
            telefono: '3001234567',
            fecha_nacimiento: '1995-05-15'
        });

        console.log('📤 Enviando datos:', Object.fromEntries(formData));

        const response = await fetch('http://localhost:3000/student/profile/update', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Cookie': 'connect.sid=s%3A...' // Necesitaríamos la cookie de sesión real
            },
            body: formData
        });

        console.log('📥 Status de respuesta:', response.status);
        console.log('📥 Headers de respuesta:', Object.fromEntries(response.headers));

        const responseText = await response.text();
        console.log('📥 Respuesta del servidor:', responseText);

        if (response.headers.get('content-type')?.includes('application/json')) {
            try {
                const data = JSON.parse(responseText);
                console.log('✅ Respuesta JSON:', data);
            } catch (e) {
                console.log('❌ Error parseando JSON:', e.message);
            }
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testProfileUpdate();