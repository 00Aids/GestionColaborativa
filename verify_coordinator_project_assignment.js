const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyCoordinatorAssignment() {
  let connection;
  
  try {
    console.log('🔍 Verificando asignación específica del coordinador al proyecto1...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    // 1. Verificar el proyecto1 específicamente
    console.log('📋 Verificando proyecto1:');
    const [projectResult] = await connection.execute(
      `SELECT p.id, p.titulo, p.descripcion, p.estado,
              p.estudiante_id, p.director_id, p.evaluador_id,
              est.nombres as estudiante_nombres, est.apellidos as estudiante_apellidos, est.email as estudiante_email,
              dir.nombres as director_nombres, dir.apellidos as director_apellidos, dir.email as director_email,
              eva.nombres as evaluador_nombres, eva.apellidos as evaluador_apellidos, eva.email as evaluador_email,
              ca.nombre as ciclo_nombre
       FROM proyectos p
       LEFT JOIN usuarios est ON p.estudiante_id = est.id
       LEFT JOIN usuarios dir ON p.director_id = dir.id
       LEFT JOIN usuarios eva ON p.evaluador_id = eva.id
       LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
       WHERE p.titulo = 'proyecto1'`,
    );

    if (projectResult.length === 0) {
      console.log('   ❌ No se encontró el proyecto1');
      return;
    }

    const project = projectResult[0];
    console.log(`   ✅ Proyecto encontrado:`);
    console.log(`      - ID: ${project.id}`);
    console.log(`      - Título: ${project.titulo}`);
    console.log(`      - Estado: ${project.estado}`);
    console.log(`      - Estudiante ID: ${project.estudiante_id} (${project.estudiante_nombres} ${project.estudiante_apellidos} - ${project.estudiante_email})`);
    console.log(`      - Director ID: ${project.director_id || 'No asignado'} ${project.director_nombres ? `(${project.director_nombres} ${project.director_apellidos} - ${project.director_email})` : ''}`);
    console.log(`      - Evaluador ID: ${project.evaluador_id || 'No asignado'} ${project.evaluador_nombres ? `(${project.evaluador_nombres} ${project.evaluador_apellidos} - ${project.evaluador_email})` : ''}`);
    console.log(`      - Ciclo: ${project.ciclo_nombre || 'No asignado'}`);

    // 2. Verificar el coordinador
    console.log('\n👤 Verificando coordinador nuevocoordinador3@test.com:');
    const [coordinatorResult] = await connection.execute(
      `SELECT u.id, u.codigo_usuario, u.nombres, u.apellidos, u.email, u.activo, 
              u.area_trabajo_id, r.nombre as rol_nombre
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id 
       WHERE u.email = ?`,
      ['nuevocoordinador3@test.com']
    );

    if (coordinatorResult.length === 0) {
      console.log('   ❌ El coordinador no existe');
      return;
    }

    const coordinator = coordinatorResult[0];
    console.log(`   ✅ Coordinador encontrado:`);
    console.log(`      - ID: ${coordinator.id}`);
    console.log(`      - Código: ${coordinator.codigo_usuario}`);
    console.log(`      - Nombre: ${coordinator.nombres} ${coordinator.apellidos}`);
    console.log(`      - Email: ${coordinator.email}`);
    console.log(`      - Rol: ${coordinator.rol_nombre}`);
    console.log(`      - Área: ${coordinator.area_trabajo_id || 'No asignada'}`);

    // 3. Verificar si el coordinador está asignado al proyecto1
    console.log('\n🤝 Verificando asignación al proyecto1:');
    
    const isDirector = project.director_id === coordinator.id;
    const isEvaluator = project.evaluador_id === coordinator.id;
    const isStudent = project.estudiante_id === coordinator.id;

    console.log(`   📋 Roles en proyecto1:`);
    console.log(`      - Es Director: ${isDirector ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      - Es Evaluador: ${isEvaluator ? '✅ SÍ' : '❌ NO'}`);
    console.log(`      - Es Estudiante: ${isStudent ? '✅ SÍ' : '❌ NO'}`);

    // 4. Verificar invitaciones relacionadas con este proyecto
    console.log('\n📧 Verificando invitaciones para proyecto1:');
    const [invitationsResult] = await connection.execute(
      `SELECT i.*, p.titulo as proyecto_titulo
       FROM invitaciones i
       LEFT JOIN proyectos p ON i.proyecto_id = p.id
       WHERE i.proyecto_id = ? OR (i.email = ? AND p.titulo = 'proyecto1')
       ORDER BY i.created_at DESC`,
      [project.id, 'nuevocoordinador3@test.com']
    );

    if (invitationsResult.length === 0) {
      console.log('   ❌ No hay invitaciones para este proyecto');
    } else {
      console.log(`   ✅ Se encontraron ${invitationsResult.length} invitaciones:`);
      invitationsResult.forEach((invitation, index) => {
        console.log(`\n   📨 Invitación ${index + 1}:`);
        console.log(`      - Email: ${invitation.email || 'No especificado'}`);
        console.log(`      - Proyecto: ${invitation.proyecto_titulo || 'Proyecto no encontrado'}`);
        console.log(`      - Código: ${invitation.codigo || 'No especificado'}`);
        console.log(`      - Estado: ${invitation.estado}`);
        console.log(`      - Fecha creación: ${invitation.created_at}`);
        console.log(`      - Fecha aceptación: ${invitation.fecha_aceptacion || 'No aceptada'}`);
      });
    }

    // 5. Verificar si el admin está relacionado con el proyecto
    console.log('\n🏢 Verificando relación del admin con proyecto1:');
    const [adminResult] = await connection.execute(
      `SELECT u.id, u.nombres, u.apellidos, u.email
       FROM usuarios u 
       WHERE u.email = ?`,
      ['nuevoadmin@test.com']
    );

    if (adminResult.length > 0) {
      const admin = adminResult[0];
      const adminIsDirector = project.director_id === admin.id;
      const adminIsEvaluator = project.evaluador_id === admin.id;
      const adminIsStudent = project.estudiante_id === admin.id;

      console.log(`   👤 Admin (${admin.nombres} ${admin.apellidos}):`);
      console.log(`      - Es Director del proyecto1: ${adminIsDirector ? '✅ SÍ' : '❌ NO'}`);
      console.log(`      - Es Evaluador del proyecto1: ${adminIsEvaluator ? '✅ SÍ' : '❌ NO'}`);
      console.log(`      - Es Estudiante del proyecto1: ${adminIsStudent ? '✅ SÍ' : '❌ NO'}`);
    }

    // 6. Resumen final
    console.log('\n📊 RESUMEN FINAL:');
    const coordinatorAssigned = isDirector || isEvaluator || isStudent;
    const hasInvitations = invitationsResult.length > 0;
    const hasAcceptedInvitation = invitationsResult.some(inv => inv.estado === 'aceptada');

    console.log(`   👤 Coordinador existe: ✅`);
    console.log(`   📋 Proyecto1 existe: ✅`);
    console.log(`   🤝 Coordinador asignado al proyecto1: ${coordinatorAssigned ? '✅' : '❌'}`);
    console.log(`   📧 Tiene invitaciones: ${hasInvitations ? '✅' : '❌'}`);
    console.log(`   ✅ Invitación aceptada: ${hasAcceptedInvitation ? '✅' : '❌'}`);

    if (coordinatorAssigned) {
      const role = isDirector ? 'Director' : isEvaluator ? 'Evaluador' : 'Estudiante';
      console.log(`\n🎉 ¡CONFIRMADO! El coordinador está asignado al proyecto1 como ${role}.`);
    } else if (hasAcceptedInvitation) {
      console.log('\n⚠️ El coordinador aceptó una invitación pero no está asignado al proyecto. Posible error en el proceso.');
    } else if (hasInvitations) {
      const pendingInvitation = invitationsResult.find(inv => inv.estado === 'pendiente');
      if (pendingInvitation) {
        console.log('\n⏳ El coordinador tiene una invitación pendiente para proyecto1.');
      } else {
        console.log('\n❌ Las invitaciones existen pero no están pendientes o aceptadas correctamente.');
      }
    } else {
      console.log('\n❌ El coordinador NO está asignado al proyecto1 y no tiene invitaciones.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

verifyCoordinatorAssignment();