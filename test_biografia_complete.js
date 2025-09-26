const http = require('http');
const querystring = require('querystring');

// Función para hacer peticiones HTTP
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data
                });
            });
        });

        req.on('error', reject);
        
        if (postData) {
            req.write(postData);
        }
        req.end();
    });
}

async function testBiografiaComplete() {
    try {
        console.log('🧪 Prueba completa de funcionalidad de biografía\n');

        // 1. Login para obtener cookies de sesión
        console.log('1️⃣ Iniciando sesión...');
        const loginData = querystring.stringify({
            email: 'estudiante1@test.com',
            password: 'Jj123123'
        });

        const loginResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(loginData)
            }
        }, loginData);

        if (loginResponse.statusCode !== 302) {
            console.log('❌ Error en login:', loginResponse.statusCode);
            return;
        }

        const cookies = loginResponse.headers['set-cookie'];
        const cookieHeader = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';
        console.log('✅ Login exitoso, cookies obtenidas');

        // 2. Actualizar biografía
        console.log('\n2️⃣ Actualizando biografía...');
        const testBiografia = `Biografía de prueba actualizada - ${new Date().toISOString()}`;
        
        const biografiaData = JSON.stringify({
            biografia: testBiografia
        });

        const biografiaResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/student/profile/additional-info',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(biografiaData),
                'Cookie': cookieHeader,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            }
        }, biografiaData);

        console.log('📊 Respuesta biografía:', biografiaResponse.statusCode);
        
        if (biografiaResponse.statusCode === 200) {
            const responseData = JSON.parse(biografiaResponse.body);
            console.log('✅ Biografía actualizada:', responseData.message);
        } else {
            console.log('❌ Error actualizando biografía:', biografiaResponse.body);
            return;
        }

        // 3. Verificar en base de datos
        console.log('\n3️⃣ Verificando en base de datos...');
        const mysql = require('mysql2/promise');
        require('dotenv').config();

        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'gestion_colaborativa'
        });

        const [users] = await connection.execute(
            'SELECT biografia FROM usuarios WHERE email = ?',
            ['estudiante1@test.com']
        );

        if (users.length > 0) {
            const dbBiografia = users[0].biografia;
            console.log('📄 Biografía en BD:', dbBiografia);
            
            if (dbBiografia === testBiografia) {
                console.log('✅ La biografía se guardó correctamente en la base de datos');
            } else {
                console.log('❌ La biografía en BD no coincide con la enviada');
                console.log('   Enviada:', testBiografia);
                console.log('   En BD:', dbBiografia);
            }
        } else {
            console.log('❌ Usuario no encontrado en BD');
        }

        await connection.end();

        // 4. Simular recarga de página (obtener perfil)
        console.log('\n4️⃣ Simulando recarga de página...');
        const profileResponse = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/student/profile',
            method: 'GET',
            headers: {
                'Cookie': cookieHeader,
                'Accept': 'text/html'
            }
        });

        if (profileResponse.statusCode === 200) {
            const profileHtml = profileResponse.body;
            
            // Buscar la biografía en el HTML
            const textareaMatch = profileHtml.match(/<textarea[^>]*id="biografia"[^>]*>(.*?)<\/textarea>/s);
            
            if (textareaMatch) {
                const htmlBiografia = textareaMatch[1].trim();
                console.log('📄 Biografía en HTML:', htmlBiografia);
                
                if (htmlBiografia === testBiografia) {
                    console.log('✅ La biografía se muestra correctamente en el frontend');
                    console.log('\n🎉 PRUEBA EXITOSA: La funcionalidad de biografía funciona completamente');
                } else {
                    console.log('❌ La biografía en el frontend no coincide');
                    console.log('   Esperada:', testBiografia);
                    console.log('   En HTML:', htmlBiografia);
                }
            } else {
                console.log('❌ No se encontró el textarea de biografía en el HTML');
            }
        } else {
            console.log('❌ Error obteniendo perfil:', profileResponse.statusCode);
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error.message);
    }
}

testBiografiaComplete();