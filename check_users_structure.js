const { pool } = require('./src/config/database');

async function checkUsersStructure() {
  try {
    console.log('🔍 Verificando estructura de la tabla usuarios...\n');
    
    const [structure] = await pool.execute('DESCRIBE usuarios');
    
    console.log('📋 Estructura de la tabla usuarios:');
    structure.forEach(col => {
      console.log(`   - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(not null)'} ${col.Key ? `[${col.Key}]` : ''}`);
    });
    
    console.log('\n🔍 Verificando valores únicos en campos relacionados con tipo...');
    
    // Verificar si hay campo tipo_usuario, tipo, rol, etc.
    const typeFields = ['tipo_usuario', 'tipo', 'rol', 'role', 'user_type'];
    
    for (const field of typeFields) {
      try {
        const [values] = await pool.execute(`SELECT DISTINCT ${field} FROM usuarios WHERE ${field} IS NOT NULL LIMIT 10`);
        if (values.length > 0) {
          console.log(`\n✅ Campo '${field}' encontrado con valores:`);
          values.forEach(val => {
            console.log(`   - ${val[field]}`);
          });
        }
      } catch (error) {
        // Campo no existe, continuar
      }
    }
    
    console.log('\n🔍 Verificando algunos usuarios de ejemplo...');
    const [sampleUsers] = await pool.execute('SELECT * FROM usuarios LIMIT 5');
    
    sampleUsers.forEach((user, index) => {
      console.log(`\n👤 Usuario ${index + 1}:`);
      Object.keys(user).forEach(key => {
        console.log(`   ${key}: ${user[key]}`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkUsersStructure();