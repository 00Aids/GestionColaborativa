const { pool } = require('./src/config/database');

async function checkDeliverableStructure() {
  const connection = await pool.getConnection();

  try {
    console.log('Verificando estructura de la tabla entregables...');
    
    // Obtener estructura de la tabla
    const [columns] = await connection.execute('DESCRIBE entregables');
    console.log('\nColumnas de la tabla entregables:');
    columns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Obtener un entregable de ejemplo
    console.log('\nEjemplo de entregable del proyecto 35:');
    const [deliverables] = await connection.execute(
      'SELECT * FROM entregables WHERE proyecto_id = 35 LIMIT 1'
    );
    
    if (deliverables.length > 0) {
      console.log('Campos disponibles:');
      Object.keys(deliverables[0]).forEach(key => {
        console.log(`- ${key}: ${deliverables[0][key]}`);
      });
    } else {
      console.log('No se encontraron entregables para el proyecto 35');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

checkDeliverableStructure();