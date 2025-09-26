const http = require('http');
const querystring = require('querystring');

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

async function testBiografiaEndpoint() {
    console.log('🧪 Probando endpoint de información adicional...');
    
    try {
        // Primero hacer login para obtener la sesión
        console.log('🔐 Iniciando sesión...');
        
        const loginData = querystring.stringify({
            email: 'estudiante1@test.com',
            password: 'Jj123123'
        });
        
        const loginOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginData)
            }
        };
        
        const loginResponse = await makeRequest(loginOptions, loginData);
        console.log('📊 Status del login:', loginResponse.statusCode);
        
        // Obtener las cookies de sesión
        const cookies = loginResponse.headers['set-cookie'];
        console.log('🍪 Cookies obtenidas:', cookies ? 'Sí' : 'No');
        
        if (!cookies) {
            console.log('❌ No se obtuvieron cookies de sesión');
            console.log('📄 Respuesta del login:', loginResponse.body.substring(0, 200));
            return;
        }
        
        // Ahora probar el endpoint de biografía
        console.log('📝 Probando endpoint de biografía...');
        
        const biografiaData = JSON.stringify({
            biografia: 'Esta es una biografía de prueba desde el script de testing.'
        });
        
        const biografiaOptions = {
            hostname: 'localhost',
            port: 3000,
            path: '/student/profile/additional-info',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json',
                'Cookie': cookies.join('; '),
                'Content-Length': Buffer.byteLength(biografiaData)
            }
        };
        
        const biografiaResponse = await makeRequest(biografiaOptions, biografiaData);
        console.log('📊 Status del endpoint biografía:', biografiaResponse.statusCode);
        console.log('📋 Content-Type:', biografiaResponse.headers['content-type']);
        
        console.log('📄 Respuesta completa:', biografiaResponse.body);
        
        try {
            const responseJson = JSON.parse(biografiaResponse.body);
            console.log('✅ Respuesta JSON válida:', responseJson);
        } catch (e) {
            console.log('❌ La respuesta no es JSON válida');
            console.log('🔍 Primeros 200 caracteres:', biografiaResponse.body.substring(0, 200));
        }
        
    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testBiografiaEndpoint();