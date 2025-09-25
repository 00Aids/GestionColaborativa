const { pool } = require('./src/config/database');

async function checkProjectsColumns() {
  try {
    console.log('🔍 Verificando columnas de la tabla proyectos...\n');
    
    const [columns] = await pool.execute('DESCRIBE proyectos');
    
    console.log('📋 Columnas disponibles en la tabla proyectos:');
    columns.forEach(column => {
      console.log(`   - ${column.Field} (${column.Type}) ${column.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${column.Key ? `[${column.Key}]` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkProjectsColumns();