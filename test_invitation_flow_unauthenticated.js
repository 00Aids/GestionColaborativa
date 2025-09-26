const axios = require('axios');

async function testInvitationFlow() {
    const baseURL = 'http://localhost:3000';
    
    try {
        console.log('🧪 Probando flujo de invitaciones sin autenticación...\n');
        
        // Primero, obtener una invitación válida
        console.log('1. Obteniendo invitaciones existentes...');
        
        // Crear una nueva invitación para probar
        const invitationCode = 'TEST-' + Math.random().toString(36).substring(7).toUpperCase();
        
        console.log(`2. Código de invitación de prueba: ${invitationCode}`);
        
        // Probar acceso a la página de invitación SIN autenticación
        console.log('3. Accediendo a la página de invitación sin autenticación...');
        
        const response = await axios.get(`${baseURL}/projects/invitations/accept/${invitationCode}`, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400; // Permitir redirects
            }
        });
        
        console.log(`Status: ${response.status}`);
        console.log(`Headers:`, response.headers);
        
        if (response.data.includes('invitation-options') || response.data.includes('Únete al Proyecto')) {
            console.log('✅ ¡Éxito! La página de opciones se está mostrando correctamente');
        } else if (response.data.includes('Invitación no encontrada')) {
            console.log('⚠️  Invitación no encontrada (esperado para código de prueba)');
        } else {
            console.log('❌ La página no muestra las opciones esperadas');
            console.log('Contenido recibido:', response.data.substring(0, 500) + '...');
        }
        
    } catch (error) {
        if (error.response) {
            console.log(`❌ Error HTTP ${error.response.status}: ${error.response.statusText}`);
            if (error.response.status === 302) {
                console.log('Redirect a:', error.response.headers.location);
            }
        } else {
            console.log('❌ Error:', error.message);
        }
    }
}

// Función para obtener una invitación real del sistema
async function getValidInvitation() {
    try {
        console.log('🔍 Buscando invitaciones válidas en la base de datos...');
        
        const mysql = require('mysql2/promise');
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gestion_colaborativa'
        });
        
        const [rows] = await connection.execute(
            'SELECT codigo FROM invitaciones WHERE estado = "pendiente" LIMIT 1'
        );
        
        await connection.end();
        
        if (rows.length > 0) {
            return rows[0].codigo;
        } else {
            console.log('⚠️  No se encontraron invitaciones pendientes');
            return null;
        }
        
    } catch (error) {
        console.log('❌ Error al buscar invitaciones:', error.message);
        return null;
    }
}

async function testWithRealInvitation() {
    const validCode = await getValidInvitation();
    
    if (!validCode) {
        console.log('No hay invitaciones válidas para probar');
        return;
    }
    
    console.log(`\n🧪 Probando con invitación real: ${validCode}`);
    
    try {
        const response = await axios.get(`http://localhost:3000/projects/invitations/accept/${validCode}`, {
            maxRedirects: 0,
            validateStatus: function (status) {
                return status >= 200 && status < 400;
            }
        });
        
        console.log(`Status: ${response.status}`);
        
        if (response.data.includes('invitation-options') || response.data.includes('Únete al Proyecto')) {
            console.log('✅ ¡Éxito! La página de opciones se muestra correctamente');
        } else if (response.data.includes('accept-invitation')) {
            console.log('⚠️  Se muestra la página de aceptación normal (usuario podría estar autenticado)');
        } else {
            console.log('❌ Respuesta inesperada');
            console.log('Contenido:', response.data.substring(0, 300) + '...');
        }
        
    } catch (error) {
        console.log('❌ Error:', error.response ? error.response.status : error.message);
    }
}

// Ejecutar las pruebas
async function runTests() {
    await testInvitationFlow();
    await testWithRealInvitation();
}

runTests();