const http = require('http');

async function testCorrectedPost() {
  const invitationCode = 'BD4D6A30E22860406F00B30593AA74A2';
  const url = `http://localhost:3000/projects/invitations/accept/${invitationCode}`;
  
  console.log(`🔍 Probando POST a URL corregida: ${url}`);
  
  const postData = JSON.stringify({});
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: `/projects/invitations/accept/${invitationCode}`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Cookie': 'connect.sid=s%3A1234567890.abcdefghijklmnopqrstuvwxyz' // Cookie de sesión simulada
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ El POST a la URL corregida responde correctamente');
          console.log('📄 Respuesta:');
          console.log(data.substring(0, 500) + '...');
        } else if (res.statusCode === 500) {
          console.log('❌ Error 500: Error interno del servidor');
          console.log('📄 Respuesta:');
          console.log(data.substring(0, 500) + '...');
        } else if (res.statusCode === 302) {
          console.log('✅ Redirección 302: Probablemente redirigiendo después de procesar');
          console.log('📍 Location:', res.headers.location);
        } else {
          console.log(`⚠️ Status Code: ${res.statusCode}`);
          console.log('📄 Respuesta:');
          console.log(data.substring(0, 500) + '...');
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Error de conexión:', err.message);
      reject(err);
    });
    
    req.setTimeout(5000, () => {
      console.error('❌ Timeout: La petición tardó más de 5 segundos');
      req.destroy();
      reject(new Error('Timeout'));
    });
    
    req.write(postData);
    req.end();
  });
}

testCorrectedPost().catch(console.error);