const bcrypt = require('bcryptjs');

const storedHash = '$2a$10$kzcvGaLwiWf/5VmmjHpePuLyNWlGATpaVvd2ptmmkhr94pzdZidtK';

// Lista de contraseñas comunes para probar
const passwordsToTest = [
  '123123123',
  '123456',
  'password',
  '123123',
  'admin',
  'test',
  'qwerty',
  '12345678',
  'password123',
  '123456789',
  'abc123',
  'admin123'
];

async function testPasswords() {
  console.log('🔍 Probando contraseñas contra el hash almacenado...');
  console.log('Hash:', storedHash);
  console.log('');
  
  for (const password of passwordsToTest) {
    try {
      const isMatch = await bcrypt.compare(password, storedHash);
      console.log(`🔑 Contraseña '${password}': ${isMatch ? '✅ COINCIDE' : '❌ No coincide'}`);
      
      if (isMatch) {
        console.log('');
        console.log(`🎉 ¡ENCONTRADA! La contraseña correcta es: '${password}'`);
        break;
      }
    } catch (error) {
      console.log(`❌ Error probando '${password}': ${error.message}`);
    }
  }
}

testPasswords().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});