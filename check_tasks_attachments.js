const { pool } = require('./src/config/database');

async function checkEntregablesTable() {
  try {
    console.log('🔍 Verificando estructura de la tabla entregables...');
    const [columns] = await pool.execute('DESCRIBE entregables');
    console.log('📋 Columnas de la tabla entregables:');
    columns.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    console.log('\n🔍 Verificando si hay entregables con archivos adjuntos...');
    const [deliverables] = await pool.execute('SELECT id, titulo, archivo_url FROM entregables WHERE archivo_url IS NOT NULL AND archivo_url != "" LIMIT 5');
    console.log(`📋 Entregables con archivos adjuntos: ${deliverables.length}`);
    deliverables.forEach(deliverable => {
      console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Archivo: ${deliverable.archivo_url}`);
    });
    
    console.log('\n🔍 Verificando todos los entregables recientes...');
    const [allDeliverables] = await pool.execute('SELECT id, titulo, descripcion, archivo_url, created_at FROM entregables ORDER BY created_at DESC LIMIT 10');
    console.log(`📋 Últimos 10 entregables creados:`);
    allDeliverables.forEach(deliverable => {
      console.log(`  - ID: ${deliverable.id}`);
      console.log(`    Título: ${deliverable.titulo}`);
      console.log(`    Archivo: ${deliverable.archivo_url || 'Sin archivo'}`);
      console.log(`    Creada: ${deliverable.created_at}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

checkEntregablesTable();