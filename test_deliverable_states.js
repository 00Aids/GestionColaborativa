const mysql = require('mysql2/promise');

async function testDeliverableStates() {
  try {
    // Conectar a la base de datos
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'gestion_academica'
    });

    console.log('🔍 Verificando estructura de la tabla entregables...');

    // Obtener información de la columna estado
    const [columns] = await connection.execute(`
      SHOW COLUMNS FROM entregables WHERE Field = 'estado'
    `);

    if (columns.length > 0) {
      console.log('📋 Información de la columna estado:');
      console.log('Tipo:', columns[0].Type);
      console.log('Default:', columns[0].Default);
      
      // Extraer los valores del ENUM
      const enumValues = columns[0].Type.match(/enum\((.*)\)/i);
      if (enumValues) {
        const values = enumValues[1].split(',').map(v => v.replace(/'/g, '').trim());
        console.log('🎯 Estados disponibles:', values);
        console.log('📊 Total de estados:', values.length);
        
        // Verificar si tenemos los estados expandidos
        const expectedStates = [
          'pendiente', 'en_progreso', 'entregado', 'en_revision', 
          'aceptado', 'rechazado', 'requiere_cambios', 'completado'
        ];
        
        const hasAllStates = expectedStates.every(state => values.includes(state));
        
        if (hasAllStates) {
          console.log('✅ Todos los estados expandidos están presentes');
        } else {
          console.log('❌ Faltan estados. Estados faltantes:');
          expectedStates.forEach(state => {
            if (!values.includes(state)) {
              console.log(`   - ${state}`);
            }
          });
        }
      }
    }

    // Verificar entregables existentes
    const [deliverables] = await connection.execute(`
      SELECT estado, COUNT(*) as count 
      FROM entregables 
      GROUP BY estado
    `);

    console.log('\n📈 Distribución actual de estados:');
    deliverables.forEach(row => {
      console.log(`   ${row.estado}: ${row.count} entregables`);
    });

    await connection.end();
    console.log('\n✅ Verificación completada');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDeliverableStates();