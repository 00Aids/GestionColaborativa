const { pool } = require('./src/config/database');
const User = require('./src/models/User');

async function checkAndCreateUser() {
  try {
    // Primero verificar la estructura de la tabla
    console.log('📊 Verificando estructura de la tabla usuarios...');
    const [rows] = await pool.execute('DESCRIBE usuarios');
    console.log('Columnas disponibles:');
    rows.forEach(row => {
      console.log(`- ${row.Field} (${row.Type}) - ${row.Null === 'YES' ? 'Nullable' : 'Not Null'}${row.Key ? ' - ' + row.Key : ''}${row.Default !== null ? ' - Default: ' + row.Default : ''}`);
    });
    
    console.log('\n🔄 Creando usuario de prueba...');
    
    const userModel = new User();
    
    // Verificar si el usuario ya existe
    const existingUser = await userModel.findByEmail('pepito@gmail.com');
    if (existingUser) {
      console.log('⚠️ El usuario ya existe, eliminándolo primero...');
      await userModel.delete(existingUser.id);
    }
    
    // Crear nuevo usuario con los nombres de columna correctos
    const userData = {
      email: 'pepito@gmail.com',
      password: '123123123',
      codigo_usuario: 'EST' + Date.now().toString().slice(-6) + Math.random().toString(36).substring(2, 5).toUpperCase(),
      nombres: 'Pepito',
      apellidos: 'Pérez',
      rol_id: 3, // 3 = estudiante (basado en la estructura típica)
      activo: true
    };
    
    const result = await userModel.create(userData);
    console.log('✅ Usuario creado exitosamente:');
    console.log('ID:', result.id);
    console.log('Email:', userData.email);
    console.log('Código:', userData.codigo_usuario);
    
    // Verificar que se creó correctamente
    const createdUser = await userModel.findByEmail('pepito@gmail.com');
    console.log('🔍 Verificación - Usuario encontrado:');
    console.log('Hash almacenado:', createdUser.password_hash);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAndCreateUser();