const http = require('http');

async function testFixedInvitation() {
  const invitationCode = 'BD4D6A30E22860406F00B30593AA74A2';
  const url = `http://localhost:3000/projects/invitations/accept/${invitationCode}`;
  
  console.log(`🔧 Probando invitación CORREGIDA: ${url}`);
  console.log('📋 Esperamos que ahora el usuario se agregue correctamente al proyecto...\n');
  
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
        console.log('\n📄 Respuesta del servidor:');
        
        if (res.statusCode === 200) {
          console.log('✅ ¡ÉXITO! La invitación se procesó correctamente');
          try {
            const jsonResponse = JSON.parse(data);
            console.log('📦 Respuesta JSON:', jsonResponse);
            if (jsonResponse.success) {
              console.log('🎉 El usuario fue agregado al proyecto exitosamente');
            }
          } catch (e) {
            console.log('📄 Respuesta (no JSON):', data);
          }
        } else if (res.statusCode === 500) {
          console.log('❌ Error 500: Aún hay un problema en el servidor');
          try {
            const errorResponse = JSON.parse(data);
            console.log('🐛 Error:', errorResponse.error);
          } catch (e) {
            console.log('📄 Respuesta de error:', data.substring(0, 300) + '...');
          }
        } else if (res.statusCode === 302) {
          console.log('🔄 Redirección 302: Probablemente redirigiendo por autenticación');
          console.log('📍 Location:', res.headers.location);
        } else {
          console.log(`⚠️ Status Code inesperado: ${res.statusCode}`);
          console.log('📄 Respuesta:', data.substring(0, 300) + '...');
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

console.log('🚀 Iniciando prueba de invitación corregida...\n');
testFixedInvitation()
  .then(() => {
    console.log('\n✅ Prueba completada');
  })
  .catch((error) => {
    console.error('\n❌ Error en la prueba:', error.message);
  });