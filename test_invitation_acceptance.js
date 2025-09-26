const http = require('http');
const querystring = require('querystring');

// Configuración del test
const HOST = 'localhost';
const PORT = 3000;
const BASE_URL = `http://${HOST}:${PORT}`;

// Función para hacer peticiones HTTP
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
                    body: data
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

async function testInvitationAcceptance() {
    console.log('🧪 Iniciando test de aceptación de invitaciones...\n');

    try {
        // 1. Primero hacer login como administrador para crear una invitación
        console.log('1. Haciendo login como administrador...');
        
        const loginData = querystring.stringify({
            email: 'admin@test.com',
            password: 'admin123'
        });

        const loginResponse = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginData)
            }
        }, loginData);

        if (loginResponse.statusCode !== 302) {
            console.log('❌ Error en login del administrador');
            return;
        }

        const adminCookies = extractCookies(loginResponse.headers);
        console.log('✅ Login exitoso');

        // 2. Crear una invitación rápida
        console.log('2. Creando invitación rápida...');
        
        const invitationData = querystring.stringify({
            max_uses: 1,
            expires_in_days: 7
        });

        const invitationResponse = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/projects/1/quick-invitation', // Asumiendo que existe proyecto con ID 1
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(invitationData),
                'Cookie': adminCookies
            }
        }, invitationData);

        if (invitationResponse.statusCode !== 200) {
            console.log('❌ Error creando invitación');
            console.log('Status:', invitationResponse.statusCode);
            console.log('Body:', invitationResponse.body);
            return;
        }

        // Extraer el código de invitación de la respuesta
        const invitationBody = JSON.parse(invitationResponse.body);
        const invitationCode = invitationBody.codigo;
        console.log('✅ Invitación creada con código:', invitationCode);

        // 3. Hacer logout del administrador
        console.log('3. Cerrando sesión del administrador...');
        await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/auth/logout',
            method: 'GET',
            headers: {
                'Cookie': adminCookies
            }
        });

        // 4. Hacer login como usuario normal
        console.log('4. Haciendo login como usuario normal...');
        
        const userLoginData = querystring.stringify({
            email: 'test@test.com',
            password: 'test123'
        });

        const userLoginResponse = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(userLoginData)
            }
        }, userLoginData);

        if (userLoginResponse.statusCode !== 302) {
            console.log('❌ Error en login del usuario normal');
            return;
        }

        const userCookies = extractCookies(userLoginResponse.headers);
        console.log('✅ Login de usuario exitoso');

        // 5. Aceptar la invitación
        console.log('5. Aceptando invitación...');
        
        const acceptResponse = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: `/invitations/accept/${invitationCode}`,
            method: 'POST',
            headers: {
                'Cookie': userCookies
            }
        });

        console.log('Status de aceptación:', acceptResponse.statusCode);
        console.log('Headers:', acceptResponse.headers);
        
        if (acceptResponse.statusCode === 302) {
            console.log('✅ Invitación aceptada exitosamente');
            console.log('Redirigido a:', acceptResponse.headers.location);
        } else {
            console.log('❌ Error aceptando invitación');
            console.log('Body:', acceptResponse.body);
        }

        console.log('\n🎉 Test completado');

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    }
}

// Ejecutar el test
testInvitationAcceptance();