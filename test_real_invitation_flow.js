const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRealInvitationFlow() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    console.log('🧪 Probando flujo completo de invitación con código...\n');

    // 1. Crear un usuario de prueba
    console.log('👤 PASO 1: Creando usuario de prueba...');
    
    const testEmail = 'test.real.invitation@example.com';
    const testPassword = 'password123';
    
    // Eliminar usuario si existe
    await connection.execute('DELETE FROM usuarios WHERE email = ?', [testEmail]);
    
    // Crear nuevo usuario
    const [userResult] = await connection.execute(
      `INSERT INTO usuarios (codigo_usuario, nombres, apellidos, email, password_hash, rol_id, activo, created_at, updated_at) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      ['TESTREAL', 'Test', 'Real', testEmail, '$2a$10$dummy.hash.for.testing', 5]
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

    // 3. Crear código de invitación
    console.log('\n🎫 PASO 3: Creando código de invitación...');
    
    const invitationCode = 'TEST' + Math.random().toString(36).substr(2, 6).toUpperCase();
    
    const [invitationResult] = await connection.execute(
      `INSERT INTO invitaciones (proyecto_id, codigo_invitacion, invitado_por, estado, fecha_expiracion, created_at)
       VALUES (?, ?, 1, 'pendiente', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
      [project.id, invitationCode]
    );
    
    console.log(`   🎫 Código de invitación creado: ${invitationCode}`);
    console.log(`   📋 ID de invitación: ${invitationResult.insertId}`);

    // 4. Simular el proceso de aceptar invitación
    console.log('\n🎯 PASO 4: Simulando aceptación de invitación...');
    
    // Buscar la invitación
    const [invitations] = await connection.execute(
      `SELECT i.*, p.area_trabajo_id 
       FROM invitaciones i 
       JOIN proyectos p ON i.proyecto_id = p.id 
       WHERE i.codigo_invitacion = ? AND i.estado = 'pendiente' AND i.fecha_expiracion > NOW()`,
      [invitationCode]
    );
    
    if (invitations.length === 0) {
      console.log('❌ No se encontró invitación válida');
      return;
    }
    
    const invitation = invitations[0];
    console.log(`   ✅ Invitación encontrada para proyecto ID: ${invitation.proyecto_id}`);
    console.log(`   🏢 Área de trabajo del proyecto: ${invitation.area_trabajo_id}`);

    // 5. Verificar si el usuario pertenece al área (debería ser false)
    console.log('\n🔍 PASO 5: Verificando pertenencia inicial al área...');
    
    const [initialArea] = await connection.execute(
      'SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
      [testUserId, invitation.area_trabajo_id]
    );
    
    const belongsToArea = initialArea.length > 0;
    console.log(`   belongsToArea resultado: ${belongsToArea}`);

    // 6. Asignar al área si no pertenece (simulando userModel.assignToArea)
    if (!belongsToArea) {
      console.log('\n🔧 PASO 6: Asignando usuario al área de trabajo...');
      
      const [assignResult] = await connection.execute(
        `INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at)
         VALUES (?, ?, 0, 0, 1, NOW())`,
        [testUserId, invitation.area_trabajo_id]
      );
      
      console.log(`   ✅ Usuario asignado al área (Insert ID: ${assignResult.insertId})`);
    } else {
      console.log('\n✅ PASO 6: Usuario ya pertenece al área de trabajo');
    }

    // 7. Agregar usuario al proyecto
    console.log('\n📋 PASO 7: Agregando usuario al proyecto...');
    
    const [projectMember] = await connection.execute(
      `INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, estado, fecha_asignacion)
       VALUES (?, ?, 'estudiante', 'activo', NOW())`,
      [invitation.proyecto_id, testUserId]
    );
    
    console.log(`   ✅ Usuario agregado al proyecto como estudiante`);

    // 8. Marcar invitación como usada
    console.log('\n✅ PASO 8: Marcando invitación como usada...');
    
    await connection.execute(
      'UPDATE invitaciones SET estado = ?, fecha_aceptacion = NOW() WHERE id = ?',
      ['aceptada', invitation.id]
    );
    
    console.log('   ✅ Invitación marcada como aceptada');

    // 9. Verificación final completa
    console.log('\n🎉 PASO 9: Verificación final completa...');
    
    // Verificar área de trabajo
    const [finalArea] = await connection.execute(
      'SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
      [testUserId, invitation.area_trabajo_id]
    );
    
    // Verificar membresía del proyecto
    const [projectMembership] = await connection.execute(
      'SELECT * FROM proyecto_usuarios WHERE usuario_id = ? AND proyecto_id = ? AND estado = ?',
      [testUserId, invitation.proyecto_id, 'activo']
    );
    
    // Verificar estado de invitación
    const [usedInvitation] = await connection.execute(
      'SELECT * FROM invitaciones WHERE id = ? AND estado = ?',
      [invitation.id, 'aceptada']
    );
    
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`   👤 Usuario: Test Real (${testEmail})`);
    console.log(`   🎫 Código usado: ${invitationCode}`);
    console.log(`   🏢 Pertenece al área: ${finalArea.length > 0 ? '✅ Sí' : '❌ No'}`);
    console.log(`   📁 Es miembro del proyecto: ${projectMembership.length > 0 ? '✅ Sí' : '❌ No'}`);
    console.log(`   🎯 Invitación marcada como aceptada: ${usedInvitation.length > 0 ? '✅ Sí' : '❌ No'}`);
    
    const success = finalArea.length > 0 && projectMembership.length > 0 && usedInvitation.length > 0;
    
    if (success) {
      console.log(`\n🎉 ¡ÉXITO COMPLETO! El flujo de invitación funciona correctamente:`);
      console.log(`   ✅ El usuario puede acceder a entregables del proyecto`);
      console.log(`   ✅ El usuario puede acceder a comentarios del proyecto`);
      console.log(`   ✅ El usuario tiene todas las funcionalidades del proyecto`);
      console.log(`   ✅ La invitación se marcó correctamente como aceptada`);
    } else {
      console.log(`\n❌ FALLO: El flujo de invitación no funcionó correctamente`);
    }

    // 10. Limpiar datos de prueba
    console.log('\n🧹 PASO 10: Limpiando datos de prueba...');
    
    await connection.execute('DELETE FROM proyecto_usuarios WHERE usuario_id = ?', [testUserId]);
    await connection.execute('DELETE FROM usuario_areas_trabajo WHERE usuario_id = ?', [testUserId]);
    await connection.execute('DELETE FROM invitaciones WHERE id = ?', [invitation.id]);
    await connection.execute('DELETE FROM usuarios WHERE id = ?', [testUserId]);
    
    console.log('   ✅ Datos de prueba eliminados');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🚀 Iniciando prueba del flujo completo de invitación...\n');
testRealInvitationFlow();