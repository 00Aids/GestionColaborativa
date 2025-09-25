const { pool } = require('./src/config/database');

async function checkUsersColumns() {
  try {
    console.log('🔍 Verificando columnas de la tabla usuarios...');
    
    const [columns] = await pool.execute(`
      SHOW COLUMNS FROM usuarios
    `);
    
    console.log('\n📋 Columnas disponibles en la tabla usuarios:');
    columns.forEach(column => {
      console.log(`  - ${column.Field} (${column.Type})`);
    });
    
    console.log('\n✅ Verificación completada');
    
  } catch (error) {
    console.error('❌ Error al verificar columnas:', error.message);
  } finally {
    await pool.end();
  }
}

checkUsersColumns();