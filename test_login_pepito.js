const User = require('./src/models/User');
const bcrypt = require('bcryptjs');

async function testLogin() {
  try {
    console.log('🔍 Probando login con pepito@gmail.com...');
    
    const userModel = new User();
    const user = await userModel.findByEmail('pepito@gmail.com');
    
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    console.log('✅ Usuario encontrado:', user.email);
    console.log('🔑 Hash en BD:', user.password_hash);
    
    const password = '123123123';
    console.log('🔑 Password ingresada:', password);
    
    // Probar la comparación
    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log('🔐 Password válida:', isValid);
    
    if (isValid) {
      console.log('🎉 ¡LOGIN EXITOSO! La contraseña funciona correctamente.');
    } else {
      console.log('❌ LOGIN FALLIDO. Hay un problema con la verificación de contraseña.');
      
      // Vamos a probar crear un nuevo hash con la misma contraseña para comparar
      console.log('\n🔧 Creando nuevo hash para comparar...');
      const newHash = await bcrypt.hash(password, 10);
      console.log('🔑 Nuevo hash:', newHash);
      
      const testNewHash = await bcrypt.compare(password, newHash);
      console.log('🔐 Nuevo hash válido:', testNewHash);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();