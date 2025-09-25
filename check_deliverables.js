const { pool } = require('./src/config/database');

async function checkDeliverables() {
  try {
    console.log('🔍 Verificando entregables y proyectos...\n');
    
    // Verificar coordinador
    const [coordinator] = await pool.execute(
      'SELECT id, nombres, apellidos, area_trabajo_id FROM usuarios WHERE email = ?',
      ['coordinador1@test.com']
    );
    
    if (coordinator.length === 0) {
      console.log('❌ Coordinador no encontrado');
      return;
    }
    
    console.log('✅ Coordinador encontrado:');
    console.log(`   ID: ${coordinator[0].id}`);
    console.log(`   Nombre: ${coordinator[0].nombres} ${coordinator[0].apellidos}`);
    console.log(`   Área de trabajo ID: ${coordinator[0].area_trabajo_id}\n`);
    
    const areaTrabajoId = coordinator[0].area_trabajo_id;
    
    // Verificar proyectos del área
    const [projects] = await pool.execute(
      'SELECT id, titulo, estado, area_trabajo_id FROM proyectos WHERE area_trabajo_id = ?',
      [areaTrabajoId]
    );
    
    console.log(`📁 Proyectos en el área ${areaTrabajoId}:`);
    if (projects.length === 0) {
      console.log('   ❌ No hay proyectos en esta área');
    } else {
      projects.forEach(project => {
        console.log(`   - ID: ${project.id}, Título: ${project.titulo}, Estado: ${project.estado}`);
      });
    }
    console.log('');
    
    // Verificar entregables
    const [deliverables] = await pool.execute(`
      SELECT 
        d.id,
        d.titulo,
        d.descripcion,
        d.fecha_entrega,
        d.estado,
        p.titulo as proyecto_titulo,
        p.area_trabajo_id
      FROM entregables d
      INNER JOIN proyectos p ON d.proyecto_id = p.id
      WHERE p.area_trabajo_id = ?
      ORDER BY d.fecha_entrega ASC
    `, [areaTrabajoId]);
    
    console.log(`📋 Entregables del área ${areaTrabajoId}:`);
    if (deliverables.length === 0) {
      console.log('   ❌ No hay entregables en esta área');
    } else {
      deliverables.forEach(deliverable => {
        console.log(`   - ID: ${deliverable.id}`);
        console.log(`     Título: ${deliverable.titulo}`);
        console.log(`     Proyecto: ${deliverable.proyecto_titulo}`);
        console.log(`     Fecha entrega: ${deliverable.fecha_entrega}`);
        console.log(`     Estado: ${deliverable.estado}`);
        console.log('');
      });
    }
    
    // Verificar entregables próximos (como en la consulta original)
    const [upcomingDeliverables] = await pool.execute(`
      SELECT 
        d.id,
        d.titulo,
        d.descripcion,
        d.fecha_entrega,
        d.estado,
        p.titulo as proyecto_titulo,
        u.nombres as estudiante_nombres,
        u.apellidos as estudiante_apellidos
      FROM entregables d
      INNER JOIN proyectos p ON d.proyecto_id = p.id
      INNER JOIN usuarios u ON p.estudiante_id = u.id
      WHERE p.area_trabajo_id = ?
      AND d.fecha_entrega >= CURDATE()
      ORDER BY d.fecha_entrega ASC
      LIMIT 20
    `, [areaTrabajoId]);
    
    console.log(`📅 Entregables próximos del área ${areaTrabajoId}:`);
    if (upcomingDeliverables.length === 0) {
      console.log('   ❌ No hay entregables próximos en esta área');
    } else {
      upcomingDeliverables.forEach(deliverable => {
        console.log(`   - ${deliverable.titulo} (${deliverable.proyecto_titulo})`);
        console.log(`     Estudiante: ${deliverable.estudiante_nombres} ${deliverable.estudiante_apellidos}`);
        console.log(`     Fecha: ${deliverable.fecha_entrega}`);
        console.log(`     Estado: ${deliverable.estado}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkDeliverables();