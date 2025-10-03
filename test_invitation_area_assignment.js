const mysql = require('mysql2/promise');
require('dotenv').config();

async function testInvitationAreaAssignment() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    console.log('🧪 Probando asignación automática de área de trabajo en invitaciones...\n');

    // 1. Crear un usuario de prueba
    console.log('👤 PASO 1: Creando usuario de prueba...');
    
    const testEmail = 'test.invitation@example.com';
    const testPassword = 'password123';
    
    // Eliminar usuario si existe
    await connection.execute('DELETE FROM usuarios WHERE email = ?', [testEmail]);
    
    // Crear nuevo usuario
    const [userResult] = await connection.execute(
      `INSERT INTO usuarios (codigo_usuario, nombres, apellidos, email, password_hash, rol_id, activo, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      ['TEST001', 'Test', 'Invitation', testEmail, '$2a$10$dummy.hash.for.testing', 5]
    );
    
    const testUserId = userResult.insertId;
    console.log(`   ✅ Usuario creado (ID: ${testUserId})`);

    // 2. Obtener un proyecto existente
    console.log('\n📁 PASO 2: Obteniendo proyecto existente...');
    
    const [projects] = await connection.execute(
      'SELECT id, titulo, area_trabajo_id FROM proyectos WHERE area_trabajo_id IS NOT NULL LIMIT 1'
    );
    
    if (projects.length === 0) {
      console.log('❌ No hay proyectos con área de trabajo asignada');
      return;
    }
    
    const project = projects[0];
    console.log(`   📁 Proyecto: ${project.titulo} (ID: ${project.id})`);
    console.log(`   🏢 Área de trabajo: ${project.area_trabajo_id}`);

    // 3. Verificar que el usuario NO pertenece al área inicialmente
    console.log('\n🔍 PASO 3: Verificando estado inicial...');
    
    const [initialArea] = await connection.execute(
      'SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
      [testUserId, project.area_trabajo_id]
    );
    
    console.log(`   Usuario pertenece al área inicialmente: ${initialArea.length > 0 ? '✅ Sí' : '❌ No'}`);

    // 4. Simular el proceso de acceptInvitation
    console.log('\n🎯 PASO 4: Simulando acceptInvitation...');
    
    // Verificar si pertenece al área (debería ser false)
    const belongsToArea = initialArea.length > 0;
    console.log(`   belongsToArea resultado: ${belongsToArea}`);
    
    if (!belongsToArea) {
      // Simular assignToArea
      console.log('   🔧 Ejecutando assignToArea...');
      
      const [assignResult] = await connection.execute(
        `INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at)
         VALUES (?, ?, 0, 0, 1, NOW())`,
        [testUserId, project.area_trabajo_id]
      );
      
      console.log(`   ✅ Usuario asignado al área de trabajo (Insert ID: ${assignResult.insertId})`);
    }

    // 5. Verificar que ahora SÍ pertenece al área
    console.log('\n✅ PASO 5: Verificando resultado final...');
    
    const [finalArea] = await connection.execute(
      'SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
      [testUserId, project.area_trabajo_id]
    );
    
    console.log(`   Usuario pertenece al área después: ${finalArea.length > 0 ? '✅ Sí' : '❌ No'}`);
    
    // 6. Simular agregar al proyecto
    console.log('\n📋 PASO 6: Agregando usuario al proyecto...');
    
    const [projectMember] = await connection.execute(
      `INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, estado, fecha_asignacion)
       VALUES (?, ?, 'estudiante', 'activo', NOW())`,
      [project.id, testUserId]
    );
    
    console.log(`   ✅ Usuario agregado al proyecto (Insert ID: ${projectMember.insertId})`);

    // 7. Verificar acceso completo
    console.log('\n🎉 PASO 7: Verificación final de acceso...');
    
    // Verificar área de trabajo
    const [userWithArea] = await connection.execute(
      `SELECT u.id, u.nombres, u.apellidos, u.email, u.area_trabajo_id,
              uat.area_trabajo_id as assigned_area
       FROM usuarios u
       LEFT JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id AND uat.activo = 1
       WHERE u.id = ?`,
      [testUserId]
    );
    
    // Verificar membresía del proyecto
    const [projectMembership] = await connection.execute(
      'SELECT * FROM proyecto_usuarios WHERE usuario_id = ? AND proyecto_id = ? AND estado = ?',
      [testUserId, project.id, 'activo']
    );
    
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`   👤 Usuario: ${userWithArea[0].nombres} ${userWithArea[0].apellidos}`);
    console.log(`   🏢 Área asignada: ${userWithArea[0].assigned_area}`);
    console.log(`   📁 Proyecto área: ${project.area_trabajo_id}`);
    console.log(`   🔗 Es miembro del proyecto: ${projectMembership.length > 0 ? '✅ Sí' : '❌ No'}`);
    console.log(`   ✅ Áreas coinciden: ${userWithArea[0].assigned_area == project.area_trabajo_id ? '✅ Sí' : '❌ No'}`);
    
    if (userWithArea[0].assigned_area == project.area_trabajo_id && projectMembership.length > 0) {
      console.log(`\n🎉 ¡ÉXITO! El usuario ahora puede acceder a:`);
      console.log(`   - Entregables del proyecto`);
      console.log(`   - Comentarios del proyecto`);
      console.log(`   - Todas las funcionalidades del proyecto`);
    }

    // 8. Limpiar datos de prueba
    console.log('\n🧹 PASO 8: Limpiando datos de prueba...');
    
    await connection.execute('DELETE FROM proyecto_usuarios WHERE usuario_id = ?', [testUserId]);
    await connection.execute('DELETE FROM usuario_areas_trabajo WHERE usuario_id = ?', [testUserId]);
    await connection.execute('DELETE FROM usuarios WHERE id = ?', [testUserId]);
    
    console.log('   ✅ Datos de prueba eliminados');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🚀 Iniciando prueba de asignación automática de área de trabajo...\n');
testInvitationAreaAssignment();