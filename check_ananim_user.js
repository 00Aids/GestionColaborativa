const { pool } = require('./src/config/database');

async function checkAnanimUser() {
  try {
    console.log('🔍 Verificando usuario ananim@gmail.com...\n');
    
    // Buscar el usuario ananim
    const [ananimUser] = await pool.execute(`
      SELECT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email,
        u.rol_id,
        u.area_trabajo_id,
        at.codigo as area_codigo,
        at.nombre as area_nombre,
        r.nombre as role_nombre
      FROM usuarios u
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.email = 'ananim@gmail.com'
    `);
    
    if (ananimUser.length === 0) {
      console.log('❌ Usuario ananim@gmail.com no encontrado');
      await pool.end();
      return;
    }
    
    const user = ananimUser[0];
    console.log('👤 Usuario encontrado:');
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Nombre: ${user.nombres} ${user.apellidos}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Rol ID: ${user.rol_id} (${user.role_nombre})`);
    console.log(`  - Área ID: ${user.area_trabajo_id}`);
    console.log(`  - Área: ${user.area_codigo} - ${user.area_nombre}`);
    
    // Verificar si es coordinador
    if (user.rol_id === 3) {
      console.log('\n✅ Es coordinador');
      
      if (!user.area_trabajo_id) {
        console.log('❌ No tiene área asignada');
        
        // Buscar el área del entregable rechazado
        const [rejectedArea] = await pool.execute(`
          SELECT DISTINCT e.area_trabajo_id, at.codigo, at.nombre
          FROM entregables e
          LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
          WHERE e.estado = 'rechazado'
          LIMIT 1
        `);
        
        if (rejectedArea.length > 0) {
          const targetArea = rejectedArea[0];
          console.log(`\n🎯 Área objetivo: ${targetArea.area_trabajo_id} - ${targetArea.codigo} (${targetArea.nombre})`);
          console.log('🔧 Asignando área al usuario...');
          
          await pool.execute(
            'UPDATE usuarios SET area_trabajo_id = ? WHERE id = ?',
            [targetArea.area_trabajo_id, user.id]
          );
          
          console.log('✅ Área asignada correctamente');
        }
      } else {
        console.log(`✅ Ya tiene área asignada: ${user.area_codigo}`);
      }
    } else {
      console.log(`❌ No es coordinador (rol: ${user.role_nombre})`);
    }
    
    // Verificar todas las áreas de trabajo (nuevas vs antiguas)
    console.log('\n🏢 Análisis de áreas de trabajo:');
    const [allAreas] = await pool.execute(`
      SELECT 
        at.*,
        COUNT(u.id) as coordinadores_asignados,
        COUNT(e.id) as entregables_total
      FROM areas_trabajo at
      LEFT JOIN usuarios u ON at.id = u.area_trabajo_id AND u.rol_id = 3
      LEFT JOIN entregables e ON at.id = e.area_trabajo_id
      GROUP BY at.id
      ORDER BY at.id
    `);
    
    console.log('\nÁreas encontradas:');
    allAreas.forEach(area => {
      const isNew = area.codigo.includes('-') || area.codigo.length > 6;
      console.log(`  - ID: ${area.id} | Código: ${area.codigo} | ${isNew ? '🆕 NUEVA' : '📜 ANTIGUA'}`);
      console.log(`    Nombre: ${area.nombre}`);
      console.log(`    Coordinadores: ${area.coordinadores_asignados} | Entregables: ${area.entregables_total}`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

checkAnanimUser();