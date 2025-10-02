const { pool } = require('./src/config/database');

async function testDeliverablesAccess() {
  const connection = await pool.getConnection();

  try {
    console.log('Probando acceso a entregables del proyecto 35...\n');
    
    // Verificar que hay entregables para el proyecto
    console.log('=== ENTREGABLES DEL PROYECTO 35 ===');
    const [deliverables] = await connection.execute(`
      SELECT id, titulo, descripcion, fecha_limite, fecha_entrega, estado, prioridad
      FROM entregables 
      WHERE proyecto_id = 35
      ORDER BY fecha_limite
    `);
    
    if (deliverables.length === 0) {
      console.log('❌ No hay entregables para el proyecto 35');
      
      // Crear un entregable de prueba
      console.log('\nCreando entregable de prueba...');
      await connection.execute(`
        INSERT INTO entregables (proyecto_id, titulo, descripcion, fecha_limite, estado, prioridad, created_at)
        VALUES (35, 'Entregable de Prueba', 'Descripción del entregable de prueba', DATE_ADD(NOW(), INTERVAL 7 DAY), 'pendiente', 'media', NOW())
      `);
      
      console.log('✅ Entregable de prueba creado');
      
      // Volver a consultar
      const [newDeliverables] = await connection.execute(`
        SELECT id, titulo, descripcion, fecha_limite, fecha_entrega, estado, prioridad
        FROM entregables 
        WHERE proyecto_id = 35
        ORDER BY fecha_limite
      `);
      
      console.log(`\nEntregables encontrados: ${newDeliverables.length}`);
      newDeliverables.forEach(deliverable => {
        console.log(`- ${deliverable.titulo}`);
        console.log(`  Estado: ${deliverable.estado}, Prioridad: ${deliverable.prioridad}`);
        console.log(`  Fecha límite: ${deliverable.fecha_limite}`);
      });
    } else {
      console.log(`Entregables encontrados: ${deliverables.length}`);
      deliverables.forEach(deliverable => {
        console.log(`- ${deliverable.titulo}`);
        console.log(`  Estado: ${deliverable.estado}, Prioridad: ${deliverable.prioridad}`);
        console.log(`  Fecha límite: ${deliverable.fecha_limite}`);
      });
    }
    
    // Verificar acceso de cada usuario
    console.log('\n=== VERIFICANDO ACCESO DE USUARIOS ===');
    const [projectMembers] = await connection.execute(`
      SELECT pm.usuario_id, u.nombres, u.apellidos, u.email, u.area_trabajo_id, r.nombre as rol_nombre
      FROM project_members pm
      JOIN usuarios u ON pm.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE pm.proyecto_id = 35 AND pm.activo = 1
    `);
    
    // Verificar información del proyecto
    const [project] = await connection.execute(
      'SELECT area_trabajo_id, estudiante_id FROM proyectos WHERE id = 35'
    );
    
    console.log(`Área del proyecto: ${project[0].area_trabajo_id}`);
    console.log(`Estudiante principal: ${project[0].estudiante_id}`);
    
    projectMembers.forEach(member => {
      console.log(`\n👤 ${member.nombres} ${member.apellidos} (${member.email})`);
      console.log(`   Rol: ${member.rol_nombre}`);
      console.log(`   Área de trabajo: ${member.area_trabajo_id}`);
      
      // Verificar condiciones de acceso
      const sameArea = member.area_trabajo_id === project[0].area_trabajo_id;
      const isStudent = member.rol_nombre === 'Estudiante';
      const isPrincipalStudent = member.usuario_id === project[0].estudiante_id;
      
      console.log(`   ✓ Misma área: ${sameArea ? 'Sí' : 'No'}`);
      console.log(`   ✓ Es estudiante: ${isStudent ? 'Sí' : 'No'}`);
      console.log(`   ✓ Es estudiante principal: ${isPrincipalStudent ? 'Sí' : 'No'}`);
      
      if (sameArea && isStudent) {
        console.log(`   🟢 ACCESO PERMITIDO`);
      } else {
        console.log(`   🔴 ACCESO DENEGADO`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

testDeliverablesAccess();