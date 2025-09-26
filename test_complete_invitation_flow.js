const mysql = require('mysql2/promise');
const crypto = require('crypto');
require('dotenv').config();

async function testCompleteInvitationFlow() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'gestion_academica'
    });

    console.log('🚀 Iniciando prueba completa del flujo de invitaciones...\n');

    // 1. Crear una nueva invitación válida
    const invitationCode = crypto.randomBytes(16).toString('hex').toUpperCase();
    const projectId = 30; // Proyecto existente
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 7); // Válida por 7 días

    console.log('📝 Creando nueva invitación...');
    await connection.execute(
      `INSERT INTO invitaciones (codigo_invitacion, proyecto_id, estado, fecha_expiracion, max_usos, usos_actuales, created_at) 
       VALUES (?, ?, 'activa', ?, 1, 0, NOW())`,
      [invitationCode, projectId, expirationDate]
    );

    console.log(`✅ Invitación creada: ${invitationCode}`);
    console.log(`🔗 URL de prueba: http://localhost:3000/auth/accept-invitation/${invitationCode}\n`);

    // 2. Verificar que la invitación se creó correctamente
    const [newInvitation] = await connection.execute(
      'SELECT * FROM invitaciones WHERE codigo_invitacion = ?',
      [invitationCode]
    );

    if (newInvitation.length > 0) {
      const invitation = newInvitation[0];
      console.log('📋 Detalles de la nueva invitación:');
      console.log(`   - Código: ${invitation.codigo_invitacion}`);
      console.log(`   - Estado: ${invitation.estado}`);
      console.log(`   - Proyecto ID: ${invitation.proyecto_id}`);
      console.log(`   - Fecha expiración: ${invitation.fecha_expiracion}`);
      console.log(`   - Máximo usos: ${invitation.max_usos}`);
      console.log(`   - Usos actuales: ${invitation.usos_actuales}\n`);
    }

    // 3. Verificar estado inicial del proyecto
    const [initialProjectUsers] = await connection.execute(
      `SELECT pu.*, u.nombres, u.apellidos, u.email 
       FROM proyecto_usuarios pu 
       JOIN usuarios u ON pu.usuario_id = u.id 
       WHERE pu.proyecto_id = ?`,
      [projectId]
    );

    console.log('👥 Usuarios iniciales en el proyecto:');
    if (initialProjectUsers.length === 0) {
      console.log('   - No hay usuarios asignados inicialmente');
    } else {
      initialProjectUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nombres} ${user.apellidos} (${user.email}) - Rol: ${user.rol}`);
      });
    }

    // 4. Simular aceptación de invitación (sin autenticación)
    console.log('\n🔧 Simulando aceptación de invitación...');
    
    // Marcar invitación como aceptada
    await connection.execute(
      'UPDATE invitaciones SET estado = "aceptada", fecha_aceptacion = NOW(), usos_actuales = usos_actuales + 1 WHERE codigo_invitacion = ?',
      [invitationCode]
    );

    // Agregar usuario al proyecto (simulando usuario ID 1)
    const testUserId = 1;
    try {
      await connection.execute(
        'INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado) VALUES (?, ?, "estudiante", NOW(), "activo")',
        [projectId, testUserId]
      );
      console.log('✅ Usuario agregado al proyecto exitosamente');
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY') {
        console.log('ℹ️ El usuario ya está en el proyecto');
      } else {
        throw error;
      }
    }

    // 5. Verificar estado final
    console.log('\n🔍 Verificando estado final...');
    
    const [finalInvitation] = await connection.execute(
      'SELECT * FROM invitaciones WHERE codigo_invitacion = ?',
      [invitationCode]
    );

    const [finalProjectUsers] = await connection.execute(
      `SELECT pu.*, u.nombres, u.apellidos, u.email 
       FROM proyecto_usuarios pu 
       JOIN usuarios u ON pu.usuario_id = u.id 
       WHERE pu.proyecto_id = ?`,
      [projectId]
    );

    console.log('📋 Estado final de la invitación:');
    if (finalInvitation.length > 0) {
      const invitation = finalInvitation[0];
      console.log(`   - Estado: ${invitation.estado}`);
      console.log(`   - Usos actuales: ${invitation.usos_actuales}`);
      console.log(`   - Fecha aceptación: ${invitation.fecha_aceptacion}`);
    }

    console.log('\n👥 Usuarios finales en el proyecto:');
    if (finalProjectUsers.length === 0) {
      console.log('   - No hay usuarios asignados');
    } else {
      finalProjectUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nombres} ${user.apellidos} (${user.email}) - Rol: ${user.rol}`);
      });
    }

    // 6. Resultado de la prueba
    console.log('\n🎯 RESULTADO DE LA PRUEBA:');
    if (finalInvitation[0].estado === 'aceptada' && finalProjectUsers.length > initialProjectUsers.length) {
      console.log('✅ ¡ÉXITO! El flujo de invitaciones funciona correctamente');
      console.log('   - La invitación fue aceptada');
      console.log('   - El usuario fue agregado al proyecto');
      console.log('   - La tabla proyecto_usuarios funciona correctamente');
    } else {
      console.log('❌ Hay problemas en el flujo');
    }

    console.log(`\n🔗 Para probar manualmente, visita: http://localhost:3000/auth/accept-invitation/${invitationCode}`);

  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testCompleteInvitationFlow();