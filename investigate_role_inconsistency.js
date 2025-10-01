const mysql = require('mysql2/promise');
require('dotenv').config();

async function investigateRoleInconsistency() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 INVESTIGANDO INCONSISTENCIA DE ROL - ananim@gmail.com\n');

    const userEmail = 'ananim@gmail.com';
    const projectId = 38;

    // 1. Información básica del usuario
    const [userInfo] = await connection.execute(`
      SELECT u.id, u.email, u.nombres, u.apellidos, u.rol_id, u.codigo_usuario,
             u.created_at, u.updated_at,
             r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.email = ?
    `, [userEmail]);

    if (userInfo.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const user = userInfo[0];
    console.log('👤 INFORMACIÓN DEL USUARIO:');
    console.log('ID:', user.id);
    console.log('Email:', user.email);
    console.log('Rol principal:', user.rol_nombre, '(ID:', user.rol_id + ')');
    console.log('Creado:', user.created_at);
    console.log('Última actualización:', user.updated_at);

    // 2. Información del proyecto
    const [projectInfo] = await connection.execute(`
      SELECT p.id, p.titulo, p.descripcion, p.estado, p.created_at, p.updated_at,
             p.estudiante_id, p.director_id, p.evaluador_id,
             est.email as estudiante_email, est.nombres as estudiante_nombres,
             dir.email as director_email, dir.nombres as director_nombres,
             eval.email as evaluador_email, eval.nombres as evaluador_nombres
      FROM proyectos p
      LEFT JOIN usuarios est ON p.estudiante_id = est.id
      LEFT JOIN usuarios dir ON p.director_id = dir.id
      LEFT JOIN usuarios eval ON p.evaluador_id = eval.id
      WHERE p.id = ?
    `, [projectId]);

    console.log('\n📋 INFORMACIÓN DEL PROYECTO:');
    if (projectInfo.length > 0) {
      const project = projectInfo[0];
      console.log('ID:', project.id);
      console.log('Título:', project.titulo);
      console.log('Estado:', project.estado);
      console.log('Estudiante asignado:', project.estudiante_email || 'No asignado');
      console.log('Director asignado:', project.director_email || 'No asignado');
      console.log('Evaluador asignado:', project.evaluador_email || 'No asignado');
      console.log('Fecha creación:', project.created_at);
      console.log('Última actualización:', project.updated_at);
    }

    // 3. Detalles de la asignación en proyecto_usuarios
    const [assignmentInfo] = await connection.execute(`
      SELECT pu.*
      FROM proyecto_usuarios pu
      WHERE pu.usuario_id = ? AND pu.proyecto_id = ?
    `, [user.id, projectId]);

    console.log('\n🔗 DETALLES DE LA ASIGNACIÓN:');
    if (assignmentInfo.length > 0) {
      const assignment = assignmentInfo[0];
      console.log('Rol asignado en proyecto:', assignment.rol);
      console.log('Estado de asignación:', assignment.estado);
      console.log('Fecha de asignación:', assignment.fecha_asignacion);
      console.log('Proyecto ID:', assignment.proyecto_id);
      console.log('Usuario ID:', assignment.usuario_id);
      console.log('ID de asignación:', assignment.id);
    } else {
      console.log('❌ No se encontró asignación en proyecto_usuarios');
    }

    // 4. Verificar si hay historial de cambios (si existe tabla de historial)
    try {
      const [historialTables] = await connection.execute(`
        SHOW TABLES LIKE '%historial%'
      `);
      
      console.log('\n📚 TABLAS DE HISTORIAL DISPONIBLES:');
      if (historialTables.length > 0) {
        historialTables.forEach(table => {
          console.log('- ' + Object.values(table)[0]);
        });

        // Buscar en historial de área de trabajo si existe
        try {
          const [historialArea] = await connection.execute(`
            SELECT * FROM historial_areas_trabajo 
            WHERE usuario_id = ? 
            ORDER BY fecha_cambio DESC
          `, [user.id]);

          if (historialArea.length > 0) {
            console.log('\n📋 HISTORIAL DE ÁREAS DE TRABAJO:');
            historialArea.forEach((record, index) => {
              console.log(`${index + 1}. Fecha: ${record.fecha_cambio}`);
              console.log(`   Área anterior: ${record.area_anterior_id || 'N/A'}`);
              console.log(`   Área nueva: ${record.area_nueva_id || 'N/A'}`);
              console.log(`   Motivo: ${record.motivo || 'No especificado'}`);
            });
          }
        } catch (error) {
          console.log('- No hay historial de áreas de trabajo disponible');
        }
      } else {
        console.log('- No hay tablas de historial disponibles');
      }
    } catch (error) {
      console.log('- Error verificando historial:', error.message);
    }

    // 5. Verificar otros usuarios con roles similares en el mismo proyecto
    const [otherUsers] = await connection.execute(`
      SELECT u.email, u.nombres, u.apellidos, r.nombre as rol_sistema, pu.rol as rol_proyecto,
             pu.fecha_asignacion
      FROM proyecto_usuarios pu
      JOIN usuarios u ON pu.usuario_id = u.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE pu.proyecto_id = ? AND pu.usuario_id != ?
      ORDER BY pu.fecha_asignacion
    `, [projectId, user.id]);

    console.log('\n👥 OTROS USUARIOS EN EL MISMO PROYECTO:');
    if (otherUsers.length > 0) {
      otherUsers.forEach((otherUser, index) => {
        console.log(`${index + 1}. ${otherUser.email}`);
        console.log(`   Rol en sistema: ${otherUser.rol_sistema}`);
        console.log(`   Rol en proyecto: ${otherUser.rol_proyecto}`);
        console.log(`   Fecha asignación: ${otherUser.fecha_asignacion}`);
        
        // Detectar inconsistencias en otros usuarios
        if (otherUser.rol_sistema && otherUser.rol_proyecto) {
          const sistemaLower = otherUser.rol_sistema.toLowerCase();
          const proyectoLower = otherUser.rol_proyecto.toLowerCase();
          
          if (!sistemaLower.includes(proyectoLower) && !proyectoLower.includes('estudiante')) {
            console.log('   ⚠️  POSIBLE INCONSISTENCIA detectada');
          }
        }
        console.log('');
      });
    } else {
      console.log('- No hay otros usuarios asignados a este proyecto');
    }

    // 6. Análisis de la inconsistencia
    console.log('\n🔍 ANÁLISIS DE LA INCONSISTENCIA:');
    console.log('Rol en sistema: Coordinador Académico');
    console.log('Rol en proyecto: estudiante');
    console.log('\n💡 POSIBLES CAUSAS:');
    console.log('1. El usuario fue creado inicialmente como estudiante y luego promovido a coordinador');
    console.log('2. El proyecto fue creado antes del cambio de rol');
    console.log('3. Error en la asignación manual del proyecto');
    console.log('4. El usuario tiene múltiples roles según el contexto');

    // 7. Verificar fechas para determinar la causa más probable
    if (assignmentInfo.length > 0) {
      const assignment = assignmentInfo[0];
      const userCreated = new Date(user.created_at);
      const userUpdated = new Date(user.updated_at);
      const projectAssigned = new Date(assignment.fecha_asignacion);

      console.log('\n📅 ANÁLISIS TEMPORAL:');
      console.log('Usuario creado:', userCreated.toLocaleString());
      console.log('Usuario actualizado:', userUpdated.toLocaleString());
      console.log('Proyecto asignado:', projectAssigned.toLocaleString());

      if (projectAssigned < userUpdated) {
        console.log('✅ CAUSA PROBABLE: El proyecto fue asignado ANTES de la última actualización del usuario');
        console.log('   Esto sugiere que el rol del usuario cambió después de la asignación del proyecto');
      } else if (projectAssigned > userUpdated) {
        console.log('⚠️  El proyecto fue asignado DESPUÉS de la última actualización del usuario');
        console.log('   Esto sugiere un error en la asignación o un cambio de rol posterior');
      } else {
        console.log('ℹ️  El proyecto fue asignado al mismo tiempo que la última actualización del usuario');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

investigateRoleInconsistency();