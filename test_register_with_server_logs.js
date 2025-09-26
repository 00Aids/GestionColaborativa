const { spawn } = require('child_process');
const http = require('http');
const querystring = require('querystring');

async function testRegisterWithLogs() {
  console.log('🚀 Iniciando servidor y probando registro con logs...\n');

  // Iniciar el servidor
  const server = spawn('npm', ['start'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true
  });

  let serverReady = false;
  let serverLogs = [];
  let errorLogs = [];

  // Capturar logs del servidor
  server.stdout.on('data', (data) => {
    const log = data.toString();
    serverLogs.push(log);
    console.log('📊 SERVER LOG:', log.trim());
    
    if (log.includes('Server running on port') || log.includes('listening on')) {
      serverReady = true;
    }
  });

  server.stderr.on('data', (data) => {
    const error = data.toString();
    errorLogs.push(error);
    console.log('❌ SERVER ERROR:', error.trim());
  });

  // Esperar a que el servidor esté listo
  console.log('⏳ Esperando que el servidor esté listo...');
  await new Promise(resolve => {
    const checkServer = setInterval(() => {
      if (serverReady) {
        clearInterval(checkServer);
        resolve();
      }
    }, 500);
    
    // Timeout después de 15 segundos
    setTimeout(() => {
      clearInterval(checkServer);
      resolve();
    }, 15000);
  });

  console.log('✅ Servidor listo, probando registro...\n');

  try {
    // Datos del formulario
    const postData = querystring.stringify({
      nombre: 'Test',
      apellido: 'User',
      email: 'test.register@example.com',
      password: '123456',
      rol_id: '5'
    });

    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    console.log('📝 Enviando datos de registro...');
    
    const req = http.request(options, (res) => {
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📍 Headers:`, res.headers);
      
      if (res.headers.location) {
        console.log(`↗️ Redirección a: ${res.headers.location}`);
      }

      let responseBody = '';
      res.on('data', (chunk) => {
        responseBody += chunk;
      });

      res.on('end', () => {
        if (responseBody) {
          console.log('📄 Respuesta del servidor:');
          console.log(responseBody.substring(0, 500) + '...');
        }
      });
    });

    req.on('error', (error) => {
      console.log(`❌ Error de conexión: ${error.message}`);
    });

    req.write(postData);
    req.end();

    // Esperar un poco más para capturar logs adicionales
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('\n📋 RESUMEN DE LOGS:');
  console.log('🟢 Logs del servidor:');
  serverLogs.forEach(log => console.log('   ', log.trim()));
  
  if (errorLogs.length > 0) {
    console.log('\n🔴 Errores del servidor:');
    errorLogs.forEach(error => console.log('   ', error.trim()));
  }

  // Terminar el servidor
  server.kill();
  console.log('\n🛑 Servidor terminado');
}

testRegisterWithLogs().catch(console.error);