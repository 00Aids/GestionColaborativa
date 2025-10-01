const { pool } = require('./src/config/database');

async function fixAnanimRole() {
  try {
    console.log('🔧 Corrigiendo rol del usuario ananim@gmail.com...\n');
    
    // Verificar roles disponibles
    const [roles] = await pool.execute('SELECT * FROM roles ORDER BY id');
    console.log('📋 Roles disponibles:');
    roles.forEach(role => {
      console.log(`  - ID: ${role.id} | Nombre: ${role.nombre}`);
    });
    
    // Verificar usuario actual
    const [currentUser] = await pool.execute(`
      SELECT u.*, r.nombre as role_nombre 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id 
      WHERE u.email = 'ananim@gmail.com'
    `);
    
    if (currentUser.length === 0) {
      console.log('❌ Usuario no encontrado');
      await pool.end();
      return;
    }
    
    const user = currentUser[0];
    console.log(`\n👤 Usuario actual:`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Rol actual: ${user.rol_id} (${user.role_nombre})`);
    console.log(`  - Área: ${user.area_trabajo_id}`);
    
    // Buscar el rol de Director de Proyecto (ID 3) que actúa como coordinador
    const [coordinatorRole] = await pool.execute(`
      SELECT * FROM roles 
      WHERE id = 3 OR nombre LIKE '%Director%'
      ORDER BY id
    `);
    
    if (coordinatorRole.length === 0) {
      console.log('❌ No se encontró rol de coordinador');
      await pool.end();
      return;
    }
    
    const targetRole = coordinatorRole[0];
    console.log(`\n🎯 Rol objetivo: ${targetRole.id} (${targetRole.nombre})`);
    
    if (user.rol_id === targetRole.id) {
      console.log('✅ El usuario ya tiene el rol correcto');
    } else {
      console.log('🔄 Actualizando rol...');
      
      await pool.execute(
        'UPDATE usuarios SET rol_id = ? WHERE email = ?',
        [targetRole.id, 'ananim@gmail.com']
      );
      
      console.log('✅ Rol actualizado correctamente');
    }
    
    // Verificar resultado
    const [updatedUser] = await pool.execute(`
      SELECT u.*, r.nombre as role_nombre 
      FROM usuarios u 
      LEFT JOIN roles r ON u.rol_id = r.id 
      WHERE u.email = 'ananim@gmail.com'
    `);
    
    const updated = updatedUser[0];
    console.log(`\n✅ Usuario actualizado:`);
    console.log(`  - Email: ${updated.email}`);
    console.log(`  - Rol: ${updated.rol_id} (${updated.role_nombre})`);
    console.log(`  - Área: ${updated.area_trabajo_id}`);
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.end();
  }
}

fixAnanimRole();