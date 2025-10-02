const { pool } = require('./src/config/database');

async function checkDeliverables() {
  try {
    console.log('🔍 Verificando entregables para proyecto 35...');
    
    const [deliverables] = await pool.execute('SELECT * FROM entregables WHERE proyecto_id = 35');
    console.log('📋 Entregables encontrados:', deliverables.length);
    
    if (deliverables.length > 0) {
      console.log('📝 Detalles de entregables:');
      deliverables.forEach((d, i) => {
        console.log(`  ${i+1}. ${d.titulo} - Estado: ${d.estado} - ID: ${d.id}`);
      });
    } else {
      console.log('⚠️ No se encontraron entregables para este proyecto');
      
      // Verificar si el proyecto existe
      const [project] = await pool.execute('SELECT * FROM proyectos WHERE id = 35');
      if (project.length > 0) {
        console.log('✅ El proyecto 35 existe:', project[0].titulo);
      } else {
        console.log('❌ El proyecto 35 no existe');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkDeliverables();