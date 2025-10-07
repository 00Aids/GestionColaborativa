const { pool } = require('./src/config/database');

async function findSimilarUsers() {
  try {
    console.log('🔍 Buscando usuarios con emails similares a coordifinal...\n');

    const [users] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.email LIKE '%coordi%' OR u.email LIKE '%final%'
      ORDER BY u.email
    `);

    console.log(`✅ Usuarios encontrados: ${users.length}`);
    users.forEach(user => {
      console.log(`   - ID: ${user.id} | ${user.nombres} ${user.apellidos}`);
      console.log(`     Email: ${user.email}`);
      console.log(`     Rol: ${user.rol_nombre || 'Sin rol'}`);
      console.log('');
    });

    // También buscar todos los coordinadores
    console.log('📋 Todos los coordinadores en el sistema:');
    const [coordinators] = await pool.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.email
      FROM usuarios u
      WHERE u.rol_id = 3
      ORDER BY u.email
    `);

    coordinators.forEach(coord => {
      console.log(`   - ${coord.nombres} ${coord.apellidos} | ${coord.email}`);
    });

    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

findSimilarUsers();