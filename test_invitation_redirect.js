const http = require('http');
const querystring = require('querystring');

// Configuración del test
const HOST = 'localhost';
const PORT = 3000;

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

async function testInvitationRedirect() {
    console.log('🧪 Probando redirección después de aceptar invitación...\n');

    try {
        // 1. Login como administrador para crear invitación
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
            console.log('Status:', loginResponse.statusCode);
            return;
        }

        const adminCookies = extractCookies(loginResponse.headers);
        console.log('✅ Login exitoso');

        // 2. Crear invitación rápida
        console.log('2. Creando invitación rápida...');
        
        const invitationData = querystring.stringify({
            max_uses: 1,
            expires_in_days: 7
        });

        const invitationResponse = await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/projects/30/quick-invitation', // Usando el proyecto que mencionaste
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
            console.log('Body:', invitationResponse.body.substring(0, 500));
            return;
        }

        const invitationBody = JSON.parse(invitationResponse.body);
        const invitationCode = invitationBody.codigo;
        console.log('✅ Invitación creada con código:', invitationCode);

        // 3. Logout del administrador
        await makeRequest({
            hostname: HOST,
            port: PORT,
            path: '/auth/logout',
            method: 'GET',
            headers: {
                'Cookie': adminCookies
            }
        });

        // 4. Login como usuario normal
        console.log('3. Haciendo login como usuario normal...');
        
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

        // 5. Aceptar invitación
        console.log('4. Aceptando invitación...');
        
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
        console.log('Headers de redirección:', acceptResponse.headers.location);
        
        if (acceptResponse.statusCode === 302) {
            console.log('✅ Invitación aceptada y redirigida correctamente');
            console.log('Redirigido a:', acceptResponse.headers.location);
            
            if (acceptResponse.headers.location === '/dashboard') {
                console.log('🎉 ¡Perfecto! Ahora redirige al dashboard en lugar de mostrar JSON');
            }
        } else {
            console.log('❌ Error en la aceptación');
            console.log('Body:', acceptResponse.body.substring(0, 500));
        }

        console.log('\n🎉 Test completado');

    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    }
}

// Ejecutar el test
testInvitationRedirect();