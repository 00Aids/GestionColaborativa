const { pool } = require('./src/config/database');

async function checkAnanimProjects() {
  try {
    console.log('🔍 Verificando proyectos de ananim@gmail.com...\n');
    
    // Verificar información del usuario
    const [user] = await pool.execute(`
      SELECT u.id, u.email, u.rol_id, r.nombre as rol_nombre, u.area_trabajo_id, a.codigo as area_codigo
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN areas_trabajo a ON u.area_trabajo_id = a.id
      WHERE u.email = ?
    `, ['ananim@gmail.com']);
    
    if (user.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }
    
    const userData = user[0];
    console.log('👤 Usuario:');
    console.log('  - ID:', userData.id);
    console.log('  - Email:', userData.email);
    console.log('  - Rol:', userData.rol_nombre);
    console.log('  - Área:', userData.area_codigo, '(ID:', userData.area_trabajo_id + ')');
    
    // Verificar proyectos donde ananim está asignado directamente
    console.log('\n📋 Proyectos donde ananim está asignado:');
    const [assignedProjects] = await pool.execute(`
      SELECT p.id, p.titulo, p.area_trabajo_id, a.codigo as area_codigo, pu.rol as rol_en_proyecto
      FROM proyectos p
      JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      LEFT JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      WHERE pu.usuario_id = ? AND pu.estado = 'activo'
    `, [userData.id]);
    
    if (assignedProjects.length > 0) {
      assignedProjects.forEach(project => {
        console.log(`  - ${project.titulo} (ID: ${project.id})`);
        console.log(`    Área: ${project.area_codigo} (ID: ${project.area_trabajo_id})`);
        console.log(`    Rol: ${project.rol_en_proyecto}`);
      });
    } else {
      console.log('  - No hay proyectos asignados directamente');
    }
    
    // Verificar proyectos en el área de trabajo del coordinador
    console.log('\n🏢 Proyectos en el área de trabajo del coordinador:');
    const [areaProjects] = await pool.execute(`
      SELECT p.id, p.titulo, p.area_trabajo_id, a.codigo as area_codigo, p.estado
      FROM proyectos p
      LEFT JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      WHERE p.area_trabajo_id = ? AND p.activo = 1
    `, [userData.area_trabajo_id]);
    
    if (areaProjects.length > 0) {
      areaProjects.forEach(project => {
        console.log(`  - ${project.titulo} (ID: ${project.id})`);
        console.log(`    Estado: ${project.estado}`);
      });
    } else {
      console.log('  - No hay proyectos en el área del coordinador');
    }
    
    // Verificar entregables que aparecen en el dashboard
    console.log('\n📄 Entregables que aparecen en el dashboard:');
    const [entregables] = await pool.execute(`
      SELECT e.id, e.titulo, e.proyecto_id, p.titulo as proyecto_titulo, 
             p.area_trabajo_id, a.codigo as proyecto_area, e.estado
      FROM entregables e
      JOIN proyectos p ON e.proyecto_id = p.id
      LEFT JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      WHERE p.area_trabajo_id = ?
      ORDER BY e.created_at DESC
      LIMIT 10
    `, [userData.area_trabajo_id]);
    
    if (entregables.length > 0) {
      entregables.forEach(entregable => {
        console.log(`  - ${entregable.titulo} (ID: ${entregable.id})`);
        console.log(`    Proyecto: ${entregable.proyecto_titulo} (ID: ${entregable.proyecto_id})`);
        console.log(`    Área del proyecto: ${entregable.proyecto_area}`);
        console.log(`    Estado: ${entregable.estado}`);
        console.log('    ---');
      });
    } else {
      console.log('  - No hay entregables en el área');
    }
    
    // Verificar el proyecto específico mencionado
    console.log('\n🔍 Verificando proyecto "levante y engordamiento de pollitasss":');
    const [specificProject] = await pool.execute(`
      SELECT p.id, p.titulo, p.area_trabajo_id, a.codigo as area_codigo, p.estado,
             pu.usuario_id, pu.rol as rol_usuario
      FROM proyectos p
      LEFT JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id AND pu.usuario_id = ?
      WHERE p.titulo LIKE '%pollitas%'
    `, [userData.id]);
    
    if (specificProject.length > 0) {
      specificProject.forEach(project => {
        console.log(`  - ${project.titulo} (ID: ${project.id})`);
        console.log(`    Área: ${project.area_codigo} (ID: ${project.area_trabajo_id})`);
        console.log(`    Estado: ${project.estado}`);
        console.log(`    ¿Ananim asignado?: ${project.usuario_id ? 'Sí (' + project.rol_usuario + ')' : 'No'}`);
      });
    } else {
      console.log('  - Proyecto no encontrado');
    }
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAnanimProjects();