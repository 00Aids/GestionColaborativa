const fetch = require('node-fetch');
const FormData = require('form-data');

async function testFormSubmission() {
    console.log('🧪 Probando envío de formulario...');
    
    try {
        // Crear FormData como lo haría el navegador
        const formData = new FormData();
        formData.append('nombres', 'Juan Carlos');
        formData.append('apellidos', 'Pérez García');
        formData.append('email', 'estudiante1@test.com');
        formData.append('telefono', '3001234567');
        formData.append('fecha_nacimiento', '1995-05-15');
        
        console.log('📝 Enviando datos:', {
            nombres: 'Juan Carlos',
            apellidos: 'Pérez García',
            email: 'estudiante1@test.com',
            telefono: '3001234567',
            fecha_nacimiento: '1995-05-15'
        });
        
        const response = await fetch('http://localhost:3000/student/profile/update', {
            method: 'PUT',
            body: formData,
            headers: {
                'Cookie': 'connect.sid=s%3AyourSessionId' // Necesitarías la cookie de sesión real
            }
        });
        
        console.log('📡 Status de respuesta:', response.status);
        console.log('📡 Headers de respuesta:', response.headers.raw());
        
        const responseText = await response.text();
        console.log('📄 Respuesta del servidor:', responseText);
        
        if (response.status === 200) {
            console.log('✅ Formulario enviado exitosamente');
        } else {
            console.log('❌ Error en el envío del formulario');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testFormSubmission();