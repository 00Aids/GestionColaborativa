const http = require('http');

async function testCorrectedUrl() {
  const invitationCode = 'BD4D6A30E22860406F00B30593AA74A2';
  const correctUrl = `http://localhost:3000/projects/invitations/accept/${invitationCode}`;
  
  console.log(`🔍 Probando URL corregida: ${correctUrl}`);
  
  return new Promise((resolve, reject) => {
    const req = http.get(correctUrl, (res) => {
      console.log(`📊 Status Code: ${res.statusCode}`);
      console.log(`📋 Headers:`, res.headers);
      
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        if (res.statusCode === 200) {
          console.log('✅ La URL corregida responde correctamente');
          console.log('📄 Contenido recibido (primeros 200 caracteres):');
          console.log(data.substring(0, 200) + '...');
        } else if (res.statusCode === 404) {
          console.log('❌ Error 404: Página no encontrada');
          console.log('📄 Respuesta:');
          console.log(data);
        } else {
          console.log(`⚠️ Status Code inesperado: ${res.statusCode}`);
          console.log('📄 Respuesta:');
          console.log(data);
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
  });
}

testCorrectedUrl().catch(console.error);