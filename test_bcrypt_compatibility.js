const bcrypt = require('bcrypt');
const bcryptjs = require('bcryptjs');

async function testCompatibility() {
  try {
    console.log('🔍 Probando compatibilidad entre bcrypt y bcryptjs...');
    
    const password = '123123123';
    const vsoyjostinHash = '$2a$10$kzcvGaLwiWf/5VmmjHpePuLyNWlGATpaVvd2ptmmkhr94pzdZidtK';
    
    console.log('Password a probar:', password);
    console.log('Hash de vsoyjostin:', vsoyjostinHash);
    console.log('');
    
    // Probar con bcrypt (lo que usa ProjectController)
    console.log('🔧 Probando con bcrypt (usado en ProjectController):');
    try {
      const bcryptResult = await bcrypt.compare(password, vsoyjostinHash);
      console.log('✅ bcrypt.compare resultado:', bcryptResult);
    } catch (error) {
      console.log('❌ bcrypt.compare error:', error.message);
    }
    
    // Probar con bcryptjs (lo que usa User model)
    console.log('🔧 Probando con bcryptjs (usado en User model):');
    try {
      const bcryptjsResult = await bcryptjs.compare(password, vsoyjostinHash);
      console.log('✅ bcryptjs.compare resultado:', bcryptjsResult);
    } catch (error) {
      console.log('❌ bcryptjs.compare error:', error.message);
    }
    
    console.log('');
    console.log('🧪 Creando hashes con ambas librerías para comparar:');
    
    // Crear hash con bcrypt
    const bcryptHash = await bcrypt.hash(password, 10);
    console.log('🔑 Hash creado con bcrypt:', bcryptHash);
    
    // Crear hash con bcryptjs
    const bcryptjsHash = await bcryptjs.hash(password, 10);
    console.log('🔑 Hash creado con bcryptjs:', bcryptjsHash);
    
    console.log('');
    console.log('🔄 Probando compatibilidad cruzada:');
    
    // bcrypt hash verificado con bcryptjs
    const crossTest1 = await bcryptjs.compare(password, bcryptHash);
    console.log('bcrypt hash + bcryptjs verify:', crossTest1);
    
    // bcryptjs hash verificado con bcrypt
    const crossTest2 = await bcrypt.compare(password, bcryptjsHash);
    console.log('bcryptjs hash + bcrypt verify:', crossTest2);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testCompatibility();