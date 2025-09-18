// SCRIPT DE PRUEBA PARA DEPURAR INVITACIÓN POR EMAIL
const fetch = require('node-fetch');

async function testEmailInvitation() {
    try {
        console.log('🧪 INICIANDO PRUEBA DE INVITACIÓN POR EMAIL');
        console.log('============================================');

        // Datos de prueba
        const testData = {
            email: 'vsoyjostin@gmail.com',
            message: 'Mensaje de prueba desde script',
            expires_in_days: 7
        };

        console.log('📋 Datos de prueba:', testData);

        // Hacer la petición
        const response = await fetch('http://localhost:3000/projects/30/invitations/email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': 'connect.sid=s%3AyourSessionId' // Necesitarás una sesión válida
            },
            body: JSON.stringify(testData)
        });

        console.log('📡 Status de respuesta:', response.status);
        console.log('📡 Headers de respuesta:', response.headers.raw());

        const result = await response.text();
        console.log('📄 Respuesta del servidor:', result);

        if (response.status === 400) {
            console.log('❌ ERROR 400 - Bad Request detectado');
            try {
                const jsonResult = JSON.parse(result);
                console.log('🔍 Error específico:', jsonResult.error);
            } catch (e) {
                console.log('🔍 Respuesta no es JSON válido');
            }
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

// Ejecutar la prueba
testEmailInvitation();