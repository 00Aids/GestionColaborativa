const mysql = require('mysql2/promise');
require('dotenv').config();

async function findAdminProjects() {
  let connection;
  
  try {
    console.log('🔍 Buscando proyectos y usuarios en el sistema...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    // 1. Buscar el usuario admin
    console.log('👤 Buscando usuario nuevoadmin@test.com:');
    const [adminResult] = await connection.execute(
      `SELECT u.id, u.codigo_usuario, u.nombres, u.apellidos, u.email, u.activo, 
              u.area_trabajo_id, r.nombre as rol_nombre
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id 
       WHERE u.email = ?`,
      ['nuevoadmin@test.com']
    );

    if (adminResult.length === 0) {
      console.log('   ❌ El usuario nuevoadmin@test.com NO existe');
    } else {
      const admin = adminResult[0];
      console.log(`   ✅ Usuario encontrado:`);
      console.log(`      - ID: ${admin.id}`);
      console.log(`      - Código: ${admin.codigo_usuario}`);
      console.log(`      - Nombre: ${admin.nombres} ${admin.apellidos}`);
      console.log(`      - Email: ${admin.email}`);
      console.log(`      - Rol: ${admin.rol_nombre}`);
      console.log(`      - Área: ${admin.area_trabajo_id || 'No asignada'}`);
      console.log(`      - Estado: ${admin.activo ? 'Activo' : 'Inactivo'}`);
    }

    // 2. Buscar todos los proyectos
    console.log('\n📋 Listando todos los proyectos:');
    const [allProjectsResult] = await connection.execute(
      `SELECT p.id, p.titulo, p.descripcion, p.estado,
              est.nombres as estudiante_nombres, est.apellidos as estudiante_apellidos, est.email as estudiante_email,
              dir.nombres as director_nombres, dir.apellidos as director_apellidos, dir.email as director_email,
              eva.nombres as evaluador_nombres, eva.apellidos as evaluador_apellidos, eva.email as evaluador_email,
              ca.nombre as ciclo_nombre
       FROM proyectos p
       LEFT JOIN usuarios est ON p.estudiante_id = est.id
       LEFT JOIN usuarios dir ON p.director_id = dir.id
       LEFT JOIN usuarios eva ON p.evaluador_id = eva.id
       LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
       ORDER BY p.id DESC`
    );

    if (allProjectsResult.length === 0) {
      console.log('   ❌ No hay proyectos en el sistema');
    } else {
      console.log(`   ✅ Se encontraron ${allProjectsResult.length} proyectos:`);
      allProjectsResult.forEach((project, index) => {
        console.log(`\n   📁 Proyecto ${index + 1}:`);
        console.log(`      - ID: ${project.id}`);
        console.log(`      - Título: ${project.titulo}`);
        console.log(`      - Estado: ${project.estado}`);
        console.log(`      - Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos} (${project.estudiante_email})`);
        console.log(`      - Director: ${project.director_nombres ? `${project.director_nombres} ${project.director_apellidos} (${project.director_email})` : 'No asignado'}`);
        console.log(`      - Evaluador: ${project.evaluador_nombres ? `${project.evaluador_nombres} ${project.evaluador_apellidos} (${project.evaluador_email})` : 'No asignado'}`);
        console.log(`      - Ciclo: ${project.ciclo_nombre || 'No asignado'}`);
      });
    }

    // 3. Buscar invitaciones
    console.log('\n📧 Listando invitaciones:');
    const [invitationsResult] = await connection.execute(
      `SELECT i.*, p.titulo as proyecto_titulo
       FROM invitaciones i
       LEFT JOIN proyectos p ON i.proyecto_id = p.id
       ORDER BY i.created_at DESC`
    );

    if (invitationsResult.length === 0) {
      console.log('   ❌ No hay invitaciones en el sistema');
    } else {
      console.log(`   ✅ Se encontraron ${invitationsResult.length} invitaciones:`);
      invitationsResult.forEach((invitation, index) => {
        console.log(`\n   📨 Invitación ${index + 1}:`);
        console.log(`      - Email: ${invitation.email}`);
        console.log(`      - Proyecto: ${invitation.proyecto_titulo || 'Proyecto no encontrado'}`);
        console.log(`      - Código: ${invitation.codigo}`);
        console.log(`      - Estado: ${invitation.estado}`);
        console.log(`      - Fecha creación: ${invitation.created_at}`);
        console.log(`      - Fecha aceptación: ${invitation.fecha_aceptacion || 'No aceptada'}`);
      });
    }

    // 4. Buscar el coordinador específico
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
      console.log('   ❌ El coordinador nuevocoordinador3@test.com NO existe');
    } else {
      const coordinator = coordinatorResult[0];
      console.log(`   ✅ Coordinador encontrado:`);
      console.log(`      - ID: ${coordinator.id}`);
      console.log(`      - Código: ${coordinator.codigo_usuario}`);
      console.log(`      - Nombre: ${coordinator.nombres} ${coordinator.apellidos}`);
      console.log(`      - Email: ${coordinator.email}`);
      console.log(`      - Rol: ${coordinator.rol_nombre}`);
      console.log(`      - Área: ${coordinator.area_trabajo_id || 'No asignada'}`);
      console.log(`      - Estado: ${coordinator.activo ? 'Activo' : 'Inactivo'}`);

      // Verificar si está en algún proyecto
      const [coordinatorProjectsResult] = await connection.execute(
        `SELECT p.id, p.titulo, 
                CASE 
                  WHEN p.director_id = ? THEN 'Director'
                  WHEN p.evaluador_id = ? THEN 'Evaluador'
                  WHEN p.estudiante_id = ? THEN 'Estudiante'
                  ELSE 'No asignado'
                END as rol_en_proyecto
         FROM proyectos p
         WHERE p.director_id = ? OR p.evaluador_id = ? OR p.estudiante_id = ?`,
        [coordinator.id, coordinator.id, coordinator.id, coordinator.id, coordinator.id, coordinator.id]
      );

      if (coordinatorProjectsResult.length > 0) {
        console.log(`\n   📋 Proyectos del coordinador:`);
        coordinatorProjectsResult.forEach(proj => {
          console.log(`      - Proyecto ${proj.id}: ${proj.titulo} (como ${proj.rol_en_proyecto})`);
        });
      } else {
        console.log(`\n   📋 El coordinador no está asignado a ningún proyecto`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

findAdminProjects();