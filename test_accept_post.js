const http = require('http');
const querystring = require('querystring');

async function testAcceptPost() {
  const invitationCode = 'BD4D6A30E22860406F00B30593AA74A2';
  const url = `/projects/invitations/accept/${invitationCode}`;
  
  console.log(`🔍 Probando POST a: http://localhost:3000${url}`);
  
  // Datos del formulario (vacío ya que no necesita datos adicionales)
  const postData = querystring.stringify({});
  
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: url,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
      // Simular que el usuario está autenticado (esto normalmente vendría de la sesión)
      'Cookie': 'connect.sid=test-session'
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
          console.log('✅ La petición POST responde correctamente');
          try {
            const jsonData = JSON.parse(data);
            console.log('📄 Respuesta JSON:', jsonData);
          } catch (e) {
            console.log('📄 Respuesta (no JSON):', data.substring(0, 200) + '...');
          }
        } else if (res.statusCode === 401) {
          console.log('🔐 Error 401: No autorizado (usuario no autenticado)');
          console.log('📄 Respuesta:', data);
        } else if (res.statusCode === 404) {
          console.log('❌ Error 404: Endpoint no encontrado');
          console.log('📄 Respuesta:', data);
        } else {
          console.log(`⚠️ Status Code inesperado: ${res.statusCode}`);
          console.log('📄 Respuesta:', data);
        }
        resolve();
      });
    });
    
    req.on('error', (err) => {
      console.error('❌ Error de conexión:', err.message);
      reject(err);
    });
    
    req.write(postData);
    req.end();
  });
}

testAcceptPost().catch(console.error);