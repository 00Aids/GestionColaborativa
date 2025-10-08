require('dotenv').config();
const { testConnection, executeQuery } = require('./src/config/database');
const Project = require('./src/models/Project');

async function runPreServerChecks(projectId = 4) {
  console.log('=== PRE-SERVER CHECKS: Validación de miembros e invitaciones ===');
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ No se pudo establecer la conexión a la base de datos. Abortando verificaciones.');
    process.exit(1);
  }

  const projectModel = new Project();
  // Verificar existencia del proyecto
  const project = await projectModel.findById(projectId);
  if (!project) {
    console.error(`❌ Proyecto con ID ${projectId} no existe.`);
    process.exit(1);
  }
  console.log(`✅ Proyecto encontrado: [${project.id}] ${project.titulo}`);

  // Miembros activos
  const activeMembers = await projectModel.getProjectMembers(projectId);
  console.log(`\n👥 Miembros activos (${activeMembers.length}):`);
  activeMembers.forEach((m, i) => {
    const nombre = `${m.nombres} ${m.apellidos}`.trim();
    console.log(`  ${i + 1}. ${nombre} | email: ${m.email} | rol: ${m.rol || m.rol_nombre || 'desconocido'} | estado: ${m.estado}`);
  });

  // Miembros inactivos
  const inactiveMembers = await executeQuery(
    `SELECT pu.*, u.nombres, u.apellidos, u.email
     FROM proyecto_usuarios pu
     LEFT JOIN usuarios u ON pu.usuario_id = u.id
     WHERE pu.proyecto_id = ? AND pu.estado <> 'activo'
     ORDER BY pu.fecha_asignacion ASC`,
    [projectId]
  );
  console.log(`\n🟧 Miembros inactivos (${inactiveMembers.length}):`);
  inactiveMembers.forEach((m, i) => {
    const nombre = `${m.nombres || ''} ${m.apellidos || ''}`.trim();
    console.log(`  ${i + 1}. ${nombre} | email: ${m.email || 'N/A'} | rol: ${m.rol || 'N/A'} | estado: ${m.estado || 'N/A'}`);
  });

  // Invitaciones del proyecto
  const invitations = await executeQuery(
    `SELECT estado, COUNT(*) as total
     FROM invitaciones
     WHERE proyecto_id = ?
     GROUP BY estado`,
    [projectId]
  );
  console.log('\n✉️ Invitaciones por estado:');
  if (invitations.length === 0) {
    console.log('  No hay invitaciones para este proyecto.');
  } else {
    invitations.forEach(inv => {
      console.log(`  ${inv.estado}: ${inv.total}`);
    });
  }

  // Resumen final
  console.log('\n=== RESUMEN ===');
  console.log(`Proyecto: ${project.titulo}`);
  console.log(`Miembros activos: ${activeMembers.length}`);
  console.log(`Miembros inactivos: ${inactiveMembers.length}`);
  const hasDirector = activeMembers.some(m => (m.rol || m.rol_nombre) === 'director');
  console.log(`Director activo presente: ${hasDirector ? 'Sí' : 'No'}`);

  console.log('\n✅ Verificaciones previas al servidor completadas.');
}

runPreServerChecks().catch(err => {
  console.error('❌ Error en pre_server_check:', err.message);
  process.exit(1);
});