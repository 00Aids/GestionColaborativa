const { pool } = require('./src/config/database');

async function diagnose() {
  try {
    console.log('🔍 Diagnosticando problema de estudiantes del coordinador...\n');

    // 1. Verificar coordinadores en el sistema
    console.log('📋 1. Verificando coordinadores...');
    const [coordinators] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.rol_id = 3
      ORDER BY u.id
    `);
    
    console.log(`✅ Coordinadores encontrados: ${coordinators.length}`);
    coordinators.forEach(coord => {
      console.log(`   - ID: ${coord.id} | ${coord.nombres} ${coord.apellidos} | ${coord.email}`);
    });

    // 2. Verificar asignaciones en proyecto_usuarios
    console.log('\n📋 2. Verificando asignaciones de coordinador...');
    const [assignments] = await pool.execute(`
      SELECT 
        pu.usuario_id,
        pu.proyecto_id,
        pu.rol,
        u.nombres,
        u.apellidos,
        p.titulo as proyecto_titulo
      FROM proyecto_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE pu.rol = 'coordinador'
      ORDER BY pu.usuario_id
    `);

    console.log(`✅ Asignaciones de coordinador: ${assignments.length}`);
    assignments.forEach(assign => {
      console.log(`   - ${assign.nombres} ${assign.apellidos} → Proyecto: ${assign.proyecto_titulo}`);
    });

    // 3. Verificar estudiantes usando la consulta actual
    if (assignments.length > 0) {
      console.log('\n📋 3. Probando consulta actual de estudiantes...');
      const coordId = assignments[0].usuario_id;
      
      const [students] = await pool.execute(`
        SELECT DISTINCT 
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado
        FROM usuarios u
        INNER JOIN proyectos p ON u.id = p.estudiante_id
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        ORDER BY u.apellidos, u.nombres
      `, [coordId]);

      console.log(`✅ Estudiantes encontrados para coordinador ID ${coordId}: ${students.length}`);
      students.forEach(student => {
        console.log(`   - ${student.nombres} ${student.apellidos} | Proyecto: ${student.proyecto_titulo}`);
      });

      // 4. Verificar proyectos directamente
      console.log('\n📋 4. Verificando proyectos con estudiantes...');
      const [projects] = await pool.execute(`
        SELECT 
          p.id,
          p.titulo,
          p.estado,
          u_est.nombres as estudiante_nombres,
          u_est.apellidos as estudiante_apellidos
        FROM proyectos p
        LEFT JOIN usuarios u_est ON p.estudiante_id = u_est.id
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        ORDER BY p.id
      `, [coordId]);

      console.log(`✅ Proyectos asignados al coordinador: ${projects.length}`);
      projects.forEach(project => {
        console.log(`   - Proyecto: ${project.titulo} (${project.estado})`);
        if (project.estudiante_nombres) {
          console.log(`     Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos}`);
        } else {
          console.log(`     ⚠️  Sin estudiante asignado`);
        }
      });
    } else {
      console.log('\n⚠️  No hay asignaciones de coordinador en el sistema');
    }

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

diagnose();