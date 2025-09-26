const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyUserAddedToProject() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    console.log('🔍 Verificando estado de la invitación y usuarios en el proyecto...\n');

    // 1. Verificar el estado de la invitación
    const invitationCode = 'BD4D6A30E22860406F00B30593AA74A2';
    const [invitations] = await connection.execute(
      'SELECT * FROM invitaciones WHERE codigo_invitacion = ?',
      [invitationCode]
    );

    if (invitations.length === 0) {
      console.log('❌ No se encontró la invitación');
      return;
    }

    const invitation = invitations[0];
    console.log('📋 Estado de la invitación:');
    console.log(`   - Código: ${invitation.codigo_invitacion}`);
    console.log(`   - Estado: ${invitation.estado}`);
    console.log(`   - Proyecto ID: ${invitation.proyecto_id}`);
    console.log(`   - Usos actuales: ${invitation.usos_actuales}`);
    console.log(`   - Máximo usos: ${invitation.max_usos}`);
    console.log(`   - Fecha creación: ${invitation.created_at}`);
    console.log(`   - Fecha aceptación: ${invitation.fecha_aceptacion || 'No aceptada'}\n`);

    // 2. Verificar usuarios en el proyecto
    const [projectUsers] = await connection.execute(
      `SELECT pu.*, u.nombres, u.apellidos, u.email 
       FROM proyecto_usuarios pu 
       JOIN usuarios u ON pu.usuario_id = u.id 
       WHERE pu.proyecto_id = ?`,
      [invitation.proyecto_id]
    );

    console.log('👥 Usuarios en el proyecto:');
    if (projectUsers.length === 0) {
      console.log('   - No hay usuarios asignados al proyecto');
    } else {
      projectUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.nombres} ${user.apellidos} (${user.email})`);
        console.log(`      - Rol: ${user.rol}`);
        console.log(`      - Fecha asignación: ${user.fecha_asignacion}`);
      });
    }

    // 3. Verificar información del proyecto
    const [projects] = await connection.execute(
      'SELECT * FROM proyectos WHERE id = ?',
      [invitation.proyecto_id]
    );

    if (projects.length > 0) {
      const project = projects[0];
      console.log(`\n📁 Información del proyecto:`);
      console.log(`   - Nombre: ${project.titulo}`);
      console.log(`   - ID: ${project.id}`);
      console.log(`   - Estado: ${project.estado}`);
    }

    // 4. Verificar si hay errores en logs recientes (simulado)
    console.log('\n🔧 Estado de la corrección:');
    if (invitation.estado === 'aceptada' && projectUsers.length > 0) {
      console.log('✅ ¡CORRECCIÓN EXITOSA! La invitación fue aceptada Y el usuario fue agregado al proyecto');
    } else if (invitation.estado === 'aceptada' && projectUsers.length === 0) {
      console.log('⚠️ La invitación fue aceptada pero NO se agregó el usuario al proyecto (problema persiste)');
    } else {
      console.log('ℹ️ La invitación aún no ha sido aceptada');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🚀 Verificando corrección del sistema de invitaciones...\n');
verifyUserAddedToProject();