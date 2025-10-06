const { pool } = require('./src/config/database');

async function checkDeliverableAssignments() {
  try {
    console.log('=== VERIFICACIÓN DE ASIGNACIÓN DE ENTREGABLES ===\n');
    
    // 1. Verificar entregables recientes
    console.log('1. Entregables recientes (últimos 10):');
    const [recentDeliverables] = await pool.execute(`
      SELECT 
        e.id, e.titulo, e.proyecto_id, e.estado, e.created_at,
        p.titulo as proyecto_titulo, p.estudiante_id,
        u.nombres, u.apellidos, u.email
      FROM entregables e
      LEFT JOIN proyectos p ON e.proyecto_id = p.id
      LEFT JOIN usuarios u ON p.estudiante_id = u.id
      ORDER BY e.created_at DESC
      LIMIT 10
    `);
    
    recentDeliverables.forEach(d => {
      console.log(`  - ID: ${d.id} | ${d.titulo}`);
      console.log(`    Proyecto: ${d.proyecto_titulo} (ID: ${d.proyecto_id})`);
      console.log(`    Estudiante: ${d.nombres || 'Sin asignar'} ${d.apellidos || ''} (ID: ${d.estudiante_id || 'NULL'})`);
      console.log(`    Estado: ${d.estado} | Creado: ${d.created_at}`);
      console.log('');
    });
    
    // 2. Verificar proyectos sin estudiante asignado
    console.log('2. Proyectos sin estudiante asignado:');
    const [unassignedProjects] = await pool.execute(`
      SELECT id, titulo, estado, created_at
      FROM proyectos 
      WHERE estudiante_id IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`   Total: ${unassignedProjects.length}`);
    unassignedProjects.forEach(p => {
      console.log(`  - ID: ${p.id} | ${p.titulo} | Estado: ${p.estado}`);
    });
    
    // 3. Verificar estudiantes disponibles
    console.log('\n3. Estudiantes disponibles:');
    const [students] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Estudiante'
      LIMIT 5
    `);
    
    students.forEach(s => {
      console.log(`  - ID: ${s.id} | ${s.nombres} ${s.apellidos} (${s.email})`);
    });
    
    // 4. Verificar entregables de un estudiante específico (si existe)
    if (students.length > 0) {
      const studentId = students[0].id;
      console.log(`\n4. Entregables del estudiante ${students[0].nombres} ${students[0].apellidos}:`);
      
      const [studentDeliverables] = await pool.execute(`
        SELECT 
          e.id, e.titulo, e.estado, e.fecha_entrega,
          p.titulo as proyecto_titulo
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        WHERE p.estudiante_id = ?
        ORDER BY e.created_at DESC
      `, [studentId]);
      
      console.log(`   Total: ${studentDeliverables.length}`);
      studentDeliverables.forEach(d => {
        console.log(`  - ${d.titulo} | Proyecto: ${d.proyecto_titulo} | Estado: ${d.estado}`);
      });
    }
    
    await pool.end();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkDeliverableAssignments();