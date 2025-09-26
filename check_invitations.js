const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkInvitations() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });

    console.log('🔍 Verificando invitaciones pendientes...');

    const [invitations] = await connection.execute(
      'SELECT codigo_invitacion, estado, fecha_expiracion, proyecto_id FROM invitaciones WHERE estado = ? LIMIT 5',
      ['pendiente']
    );

    if (invitations.length === 0) {
      console.log('❌ No hay invitaciones pendientes');
    } else {
      console.log('✅ Invitaciones pendientes encontradas:');
      invitations.forEach((inv, index) => {
        console.log(`${index + 1}. Código: ${inv.codigo_invitacion}`);
        console.log(`   Estado: ${inv.estado}`);
        console.log(`   Expira: ${inv.fecha_expiracion}`);
        console.log(`   Proyecto ID: ${inv.proyecto_id}`);
        console.log(`   URL: http://localhost:3000/projects/invitations/accept/${inv.codigo_invitacion}`);
        console.log('');
      });
    }

    await connection.end();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkInvitations();