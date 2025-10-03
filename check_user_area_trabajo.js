const { pool } = require('./src/config/database');

async function checkUserAreaTrabajo() {
  try {
    console.log('=== VERIFICACIÓN DE AREA_TRABAJO_ID ===\n');

    // 1. Verificar usuarios estudiantes
    console.log('1. USUARIOS ESTUDIANTES:');
    const [students] = await pool.execute(`
      SELECT u.id, u.email, u.nombres, u.apellidos, u.area_trabajo_id, 
             at.nombre as area_trabajo_nombre
      FROM usuarios u
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Estudiante')
      ORDER BY u.email
    `);

    students.forEach(student => {
      console.log(`- ${student.email}: area_trabajo_id = ${student.area_trabajo_id} (${student.area_trabajo_nombre || 'NO ASIGNADA'})`);
    });

    // 2. Verificar proyectos
    console.log('\n2. PROYECTOS:');
    const [projects] = await pool.execute(`
      SELECT p.id, p.titulo, p.area_trabajo_id, 
             at.nombre as area_trabajo_nombre,
             u.email as estudiante_email
      FROM proyectos p
      LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
      LEFT JOIN usuarios u ON p.estudiante_id = u.id
      ORDER BY p.id
    `);

    projects.forEach(project => {
      console.log(`- Proyecto ${project.id} (${project.titulo}): area_trabajo_id = ${project.area_trabajo_id} (${project.area_trabajo_nombre || 'NO ASIGNADA'})`);
      console.log(`  Estudiante: ${project.estudiante_email}`);
    });

    // 3. Verificar coincidencias
    console.log('\n3. VERIFICACIÓN DE COINCIDENCIAS:');
    const [matches] = await pool.execute(`
      SELECT p.id as proyecto_id, p.titulo, 
             u.email as estudiante_email,
             p.area_trabajo_id as proyecto_area,
             u.area_trabajo_id as usuario_area,
             CASE 
               WHEN p.area_trabajo_id = u.area_trabajo_id THEN 'COINCIDE' 
               ELSE 'NO COINCIDE' 
             END as estado_acceso
      FROM proyectos p
      JOIN usuarios u ON p.estudiante_id = u.id
      WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Estudiante')
      ORDER BY p.id
    `);

    matches.forEach(match => {
      console.log(`- ${match.estudiante_email} -> Proyecto ${match.proyecto_id}: ${match.estado_acceso}`);
      console.log(`  Proyecto área: ${match.proyecto_area}, Usuario área: ${match.usuario_area}`);
    });

    // 4. Verificar proyecto_usuarios
    console.log('\n4. TABLA PROYECTO_USUARIOS:');
    const [projectUsers] = await pool.execute(`
      SELECT pu.proyecto_id, pu.usuario_id,
             u.email, p.titulo,
             p.area_trabajo_id as proyecto_area,
             u.area_trabajo_id as usuario_area
      FROM proyecto_usuarios pu
      JOIN usuarios u ON pu.usuario_id = u.id
      JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Estudiante')
      ORDER BY pu.proyecto_id, u.email
    `);

    projectUsers.forEach(pu => {
      const coincide = pu.proyecto_area === pu.usuario_area ? 'COINCIDE' : 'NO COINCIDE';
      console.log(`- ${pu.email} en proyecto ${pu.proyecto_id} (${pu.titulo}): ${coincide}`);
      console.log(`  Proyecto área: ${pu.proyecto_area}, Usuario área: ${pu.usuario_area}`);
    });

    // 5. Verificar áreas de trabajo disponibles
    console.log('\n5. ÁREAS DE TRABAJO DISPONIBLES:');
    const [areas] = await pool.execute(`
      SELECT id, nombre, descripcion, activo
      FROM areas_trabajo
      ORDER BY id
    `);

    areas.forEach(area => {
      console.log(`- ID ${area.id}: ${area.nombre} (${area.activo ? 'ACTIVA' : 'INACTIVA'})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

checkUserAreaTrabajo();