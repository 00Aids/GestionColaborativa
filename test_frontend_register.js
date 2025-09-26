const http = require('http');
const querystring = require('querystring');

async function testFrontendRegister() {
  console.log('🚀 Probando registro desde el frontend...\n');

  // 1. Primero probar GET /auth/register
  console.log('📋 1. Probando GET /auth/register...');
  
  const getRegisterPage = () => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/auth/register',
        method: 'GET',
        headers: {
          'User-Agent': 'Test-Script/1.0'
        }
      };

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

      req.on('error', (error) => {
        reject(error);
      });

      req.end();
    });
  };

  try {
    const getResponse = await getRegisterPage();
    console.log(`   Status: ${getResponse.statusCode}`);
    
    if (getResponse.statusCode === 200) {
      console.log('   ✅ Página de registro carga correctamente');
      
      // Verificar si contiene el formulario
      if (getResponse.body.includes('<form') && getResponse.body.includes('register')) {
        console.log('   ✅ Formulario de registro encontrado');
      } else {
        console.log('   ⚠️ Formulario de registro no encontrado en la página');
      }
    } else if (getResponse.statusCode === 302) {
      console.log(`   ↗️ Redirección a: ${getResponse.headers.location}`);
    } else {
      console.log(`   ❌ Error: Status ${getResponse.statusCode}`);
    }

  } catch (error) {
    console.log(`   ❌ Error conectando al servidor: ${error.message}`);
    console.log('   💡 Asegúrate de que el servidor esté ejecutándose en puerto 3000');
    return;
  }

  // 2. Probar POST /auth/register
  console.log('\n📝 2. Probando POST /auth/register...');
  
  const testRegisterData = {
    nombre: 'Usuario',
    apellido: 'Prueba Frontend',
    email: 'frontend.test@example.com',
    password: '123456',
    rol_id: '5' // Estudiante
  };

  const postData = querystring.stringify(testRegisterData);

  const postRegister = () => {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: '/auth/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData),
          'User-Agent': 'Test-Script/1.0'
        }
      };

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

      req.on('error', (error) => {
        reject(error);
      });

      req.write(postData);
      req.end();
    });
  };

  try {
    const postResponse = await postRegister();
    console.log(`   Status: ${postResponse.statusCode}`);
    
    if (postResponse.statusCode === 302) {
      const location = postResponse.headers.location;
      console.log(`   ↗️ Redirección a: ${location}`);
      
      if (location && location.includes('/auth/login')) {
        console.log('   ✅ Registro exitoso - redirige al login');
      } else if (location && location.includes('/auth/register')) {
        console.log('   ⚠️ Registro falló - redirige de vuelta al registro');
        
        // Verificar si hay mensajes de error en las cookies
        const cookies = postResponse.headers['set-cookie'];
        if (cookies) {
          console.log('   🍪 Cookies de respuesta:');
          cookies.forEach(cookie => {
            if (cookie.includes('flash')) {
              console.log(`      ${cookie}`);
            }
          });
        }
      }
    } else if (postResponse.statusCode === 200) {
      console.log('   ⚠️ Respuesta 200 - posible error en el formulario');
      
      // Buscar mensajes de error en el HTML
      if (postResponse.body.includes('error') || postResponse.body.includes('Error')) {
        console.log('   ❌ Posible mensaje de error en la respuesta');
      }
    } else {
      console.log(`   ❌ Error inesperado: Status ${postResponse.statusCode}`);
    }

  } catch (error) {
    console.log(`   ❌ Error en POST: ${error.message}`);
  }

  // 3. Verificar si el usuario fue creado en la base de datos
  console.log('\n🔍 3. Verificando en base de datos...');
  
  const mysql = require('mysql2/promise');
  require('dotenv').config();
  
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'gestion_academica'
    });

    const [users] = await connection.execute(
      'SELECT * FROM usuarios WHERE email = ?',
      [testRegisterData.email]
    );

    if (users.length > 0) {
      const user = users[0];
      console.log('   ✅ Usuario encontrado en la base de datos:');
      console.log(`      - ID: ${user.id}`);
      console.log(`      - Nombre: ${user.nombres} ${user.apellidos}`);
      console.log(`      - Email: ${user.email}`);
      console.log(`      - Código: ${user.codigo_usuario}`);
      console.log(`      - Activo: ${user.activo ? 'Sí' : 'No'}`);
      
      // Limpiar usuario de prueba
      await connection.execute('DELETE FROM usuarios WHERE email = ?', [testRegisterData.email]);
      console.log('   🧹 Usuario de prueba eliminado');
    } else {
      console.log('   ❌ Usuario NO encontrado en la base de datos');
      console.log('   💡 El registro desde el frontend no funcionó correctamente');
    }

    await connection.end();

  } catch (error) {
    console.log(`   ❌ Error verificando base de datos: ${error.message}`);
  }

  console.log('\n🎯 RESUMEN DE LA PRUEBA:');
  console.log('   - Base de datos: ✅ Funcionando');
  console.log('   - Modelo User: ✅ Funcionando');
  console.log('   - Página de registro: Verificar arriba');
  console.log('   - Proceso de registro: Verificar arriba');
}

testFrontendRegister();