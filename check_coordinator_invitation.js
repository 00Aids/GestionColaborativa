const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCoordinatorInvitation() {
  let connection;
  
  try {
    console.log('🔍 Verificando invitación del coordinador nuevocoordinador3@test.com...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    // 1. Verificar si el coordinador existe
    console.log('👤 Verificando usuario coordinador:');
    const [coordinatorResult] = await connection.execute(
      `SELECT u.id, u.codigo_usuario, u.nombres, u.apellidos, u.email, u.activo, 
              u.area_trabajo_id, r.nombre as rol_nombre
       FROM usuarios u 
       LEFT JOIN roles r ON u.rol_id = r.id 
       WHERE u.email = ?`,
      ['nuevocoordinador3@test.com']
    );

    if (coordinatorResult.length === 0) {
      console.log('   ❌ El coordinador nuevocoordinador3@test.com NO existe en el sistema');
      return;
    }

    const coordinator = coordinatorResult[0];
    console.log(`   ✅ Coordinador encontrado:`);
    console.log(`      - ID: ${coordinator.id}`);
    console.log(`      - Código: ${coordinator.codigo_usuario}`);
    console.log(`      - Nombre: ${coordinator.nombres} ${coordinator.apellidos}`);
    console.log(`      - Email: ${coordinator.email}`);
    console.log(`      - Rol: ${coordinator.rol_nombre}`);
    console.log(`      - Área primaria: ${coordinator.area_trabajo_id || 'No asignada'}`);
    console.log(`      - Estado: ${coordinator.activo ? 'Activo' : 'Inactivo'}`);

    // 2. Verificar el admin y su proyecto
    console.log('\n🏢 Verificando proyecto del admin nuevoadmin@test.com:');
    const [adminProjectResult] = await connection.execute(
      `SELECT p.id, p.titulo, p.descripcion, p.ciclo_academico_id, 
              u.nombres as admin_nombres, u.apellidos as admin_apellidos,
              ca.nombre as ciclo_nombre
       FROM proyectos p
       JOIN usuarios u ON u.id IN (p.estudiante_id, p.director_id, p.evaluador_id)
       LEFT JOIN ciclos_academicos ca ON p.ciclo_academico_id = ca.id
       WHERE u.email = ?
       ORDER BY p.created_at DESC
       LIMIT 1`,
      ['nuevoadmin@test.com']
    );

    if (adminProjectResult.length === 0) {
      console.log('   ❌ No se encontró proyecto del admin nuevoadmin@test.com');
      return;
    }

    const project = adminProjectResult[0];
    console.log(`   ✅ Proyecto encontrado:`);
    console.log(`      - ID: ${project.id}`);
    console.log(`      - Título: ${project.titulo}`);
    console.log(`      - Descripción: ${project.descripcion}`);
    console.log(`      - Ciclo académico ID: ${project.ciclo_academico_id}`);
    console.log(`      - Ciclo académico: ${project.ciclo_nombre || 'Sin nombre'}`);
    console.log(`      - Relacionado con: ${project.admin_nombres} ${project.admin_apellidos}`);

    // 3. Verificar si el coordinador está en el proyecto
    console.log('\n🤝 Verificando participación del coordinador en el proyecto:');
    
    // Buscar si el coordinador es director o evaluador en algún proyecto del admin
    const [coordinatorRoleResult] = await connection.execute(
      `SELECT p.id, p.titulo, 
              CASE 
                WHEN p.director_id = ? THEN 'Director'
                WHEN p.evaluador_id = ? THEN 'Evaluador'
                ELSE 'No asignado'
              END as rol_en_proyecto
       FROM proyectos p
       WHERE (p.director_id = ? OR p.evaluador_id = ?)
         AND p.id = ?`,
      [coordinator.id, coordinator.id, coordinator.id, coordinator.id, project.id]
    );

    if (coordinatorRoleResult.length === 0) {
      console.log('   ❌ El coordinador NO está asignado a este proyecto específico');
      
      // Verificar si está en otros proyectos
      const [otherProjectsResult] = await connection.execute(
        `SELECT p.id, p.titulo, 
                CASE 
                  WHEN p.director_id = ? THEN 'Director'
                  WHEN p.evaluador_id = ? THEN 'Evaluador'
                  ELSE 'No asignado'
                END as rol_en_proyecto
         FROM proyectos p
         WHERE (p.director_id = ? OR p.evaluador_id = ?)`,
        [coordinator.id, coordinator.id, coordinator.id, coordinator.id]
      );
      
      if (otherProjectsResult.length > 0) {
        console.log('   📋 Pero está asignado a otros proyectos:');
        otherProjectsResult.forEach(proj => {
          console.log(`      - Proyecto ${proj.id}: ${proj.titulo} (como ${proj.rol_en_proyecto})`);
        });
      }
    } else {
      const role = coordinatorRoleResult[0];
      console.log(`   ✅ El coordinador SÍ está en el proyecto:`);
      console.log(`      - Rol en proyecto: ${role.rol_en_proyecto}`);
      console.log(`      - Proyecto: ${role.titulo}`);
    }

    // 4. Verificar si el coordinador está en el área de trabajo del coordinador
    console.log('\n🏗️ Verificando asignación del coordinador al área de trabajo:');
    
    // Obtener el área de trabajo del coordinador
    const coordinatorAreaId = coordinator.area_trabajo_id;
    
    if (!coordinatorAreaId) {
      console.log('   ❌ El coordinador no tiene área de trabajo asignada');
    } else {
      const [areaInfoResult] = await connection.execute(
        `SELECT at.id, at.nombre, at.descripcion
         FROM areas_trabajo at
         WHERE at.id = ?`,
        [coordinatorAreaId]
      );
      
      if (areaInfoResult.length > 0) {
        const areaInfo = areaInfoResult[0];
        console.log(`   ✅ El coordinador tiene área de trabajo asignada:`);
        console.log(`      - Área ID: ${areaInfo.id}`);
        console.log(`      - Área: ${areaInfo.nombre}`);
        console.log(`      - Descripción: ${areaInfo.descripcion || 'Sin descripción'}`);
        
        // Verificar la asignación en usuario_areas_trabajo
        const [userAreaResult] = await connection.execute(
          `SELECT uat.*, at.nombre as area_nombre
           FROM usuario_areas_trabajo uat
           LEFT JOIN areas_trabajo at ON uat.area_trabajo_id = at.id
           WHERE uat.usuario_id = ? AND uat.area_trabajo_id = ?`,
          [coordinator.id, coordinatorAreaId]
        );
        
        if (userAreaResult.length > 0) {
          const userArea = userAreaResult[0];
          console.log(`   ✅ Confirmación en usuario_areas_trabajo:`);
          console.log(`      - Es propietario: ${userArea.es_propietario ? 'Sí' : 'No'}`);
          console.log(`      - Es administrador: ${userArea.es_administrador ? 'Sí' : 'No'}`);
          console.log(`      - Estado: ${userArea.activo ? 'Activo' : 'Inactivo'}`);
        } else {
          console.log(`   ⚠️ No se encontró registro en usuario_areas_trabajo`);
        }
      }
    }

    // 5. Verificar invitaciones pendientes o aceptadas
    console.log('\n📧 Verificando invitaciones:');
    const [invitationResult] = await connection.execute(
      `SELECT i.*, p.nombre as proyecto_nombre
       FROM invitaciones i
       LEFT JOIN proyectos p ON i.proyecto_id = p.id
       WHERE i.email = ? AND i.proyecto_id = ?
       ORDER BY i.created_at DESC`,
      ['nuevocoordinador3@test.com', project.id]
    );

    if (invitationResult.length === 0) {
      console.log('   ❌ No se encontraron invitaciones para este coordinador en este proyecto');
    } else {
      invitationResult.forEach((invitation, index) => {
        console.log(`   📨 Invitación ${index + 1}:`);
        console.log(`      - Estado: ${invitation.estado}`);
        console.log(`      - Código: ${invitation.codigo}`);
        console.log(`      - Proyecto: ${invitation.proyecto_nombre}`);
        console.log(`      - Fecha creación: ${invitation.created_at}`);
        console.log(`      - Fecha aceptación: ${invitation.fecha_aceptacion || 'No aceptada'}`);
      });
    }

    // 6. Resumen final
    console.log('\n📊 RESUMEN FINAL:');
    const isInProject = coordinatorRoleResult.length > 0;
    const hasArea = !!coordinator.area_trabajo_id;
    const hasInvitation = invitationResult.length > 0;

    console.log(`   👤 Usuario existe: ✅`);
    console.log(`   🤝 En el proyecto: ${isInProject ? '✅' : '❌'}`);
    console.log(`   🏗️ Tiene área de trabajo: ${hasArea ? '✅' : '❌'}`);
    console.log(`   📧 Tiene invitación: ${hasInvitation ? '✅' : '❌'}`);

    if (isInProject && hasArea) {
      console.log('\n🎉 ¡PERFECTO! El coordinador está completamente integrado.');
    } else if (hasInvitation) {
      const pendingInvitation = invitationResult.find(inv => inv.estado === 'pendiente');
      if (pendingInvitation) {
        console.log('\n⏳ El coordinador tiene una invitación pendiente. Necesita aceptarla.');
      } else {
        console.log('\n⚠️ Hay problemas con la integración del coordinador.');
      }
    } else {
      console.log('\n❌ El coordinador no está integrado al proyecto.');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkCoordinatorInvitation();