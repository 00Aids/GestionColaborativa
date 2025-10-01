const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyUserRole() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔍 VERIFICANDO ROL DEL USUARIO ananim@gmail.com\n');

    // Verificar información básica del usuario con rol
    const [userResult] = await connection.execute(`
      SELECT u.id, u.email, u.nombres, u.apellidos, u.rol_id, u.codigo_usuario,
             u.telefono, u.activo, u.ultimo_acceso, u.created_at,
             r.nombre as rol_nombre,
             at.nombre as area_trabajo
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      WHERE u.email = ?
    `, ['ananim@gmail.com']);

    if (userResult.length === 0) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    const user = userResult[0];
    console.log('👤 INFORMACIÓN BÁSICA DEL USUARIO:');
    console.log('Email:', user.email);
    console.log('ROL ID:', user.rol_id);
    console.log('ROL NOMBRE:', user.rol_nombre);
    console.log('ID:', user.id);
    console.log('Nombres:', user.nombres || 'No especificado');
    console.log('Apellidos:', user.apellidos || 'No especificado');
    console.log('Código usuario:', user.codigo_usuario);
    console.log('Área de trabajo:', user.area_trabajo || 'No asignada');
    console.log('Activo:', user.activo ? 'Sí' : 'No');
    console.log('Último acceso:', user.ultimo_acceso);
    console.log('Creado:', user.created_at);

    // Verificar TODOS los roles en proyectos
    const [allProjectRoles] = await connection.execute(`
      SELECT p.id, p.titulo, p.descripcion, pu.rol, pu.fecha_asignacion, pu.estado
      FROM proyectos p
      JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
      WHERE pu.usuario_id = ?
      ORDER BY pu.fecha_asignacion DESC
    `, [user.id]);

    console.log('\n📋 ROLES EN PROYECTOS (' + allProjectRoles.length + ' asignaciones):');
    if (allProjectRoles.length === 0) {
      console.log('- No tiene proyectos asignados');
    } else {
      allProjectRoles.forEach((project, index) => {
        console.log(`${index + 1}. Proyecto: "${project.titulo}" (ID: ${project.id})`);
        console.log(`   - ROL EN PROYECTO: ${project.rol}`);
        console.log(`   - Estado: ${project.estado}`);
        console.log(`   - Fecha asignación: ${project.fecha_asignacion}`);
        console.log(`   - Descripción: ${project.descripcion || 'Sin descripción'}`);
        console.log('');
      });
    }

    // Contar roles específicos
    const coordinadorProjects = allProjectRoles.filter(p => p.rol === 'coordinador');
    const estudianteProjects = allProjectRoles.filter(p => p.rol === 'estudiante');
    const directorProjects = allProjectRoles.filter(p => p.rol === 'director');
    const evaluadorProjects = allProjectRoles.filter(p => p.rol === 'evaluador');

    console.log('📊 RESUMEN DE ROLES:');
    console.log('- Como coordinador:', coordinadorProjects.length, 'proyectos');
    console.log('- Como estudiante:', estudianteProjects.length, 'proyectos');
    console.log('- Como director:', directorProjects.length, 'proyectos');
    console.log('- Como evaluador:', evaluadorProjects.length, 'proyectos');

    // Verificar todos los roles disponibles
    console.log('\n🏷️  ROLES DISPONIBLES EN EL SISTEMA:');
    const [rolesResult] = await connection.execute('SELECT id, nombre, descripcion FROM roles ORDER BY id');
    rolesResult.forEach(role => {
      console.log(`- ID ${role.id}: ${role.nombre} (${role.descripcion || 'Sin descripción'})`);
    });

    // Verificar si hay inconsistencias
    console.log('\n⚠️  ANÁLISIS DE CONSISTENCIA:');
    console.log('Rol principal en sistema:', user.rol_nombre, '(ID:', user.rol_id + ')');
    
    if (coordinadorProjects.length > 0) {
      console.log('✅ Tiene proyectos como COORDINADOR');
    }
    if (estudianteProjects.length > 0) {
      console.log('✅ Tiene proyectos como ESTUDIANTE');
    }
    
    if (user.rol_nombre !== 'coordinador' && coordinadorProjects.length > 0) {
      console.log('🚨 INCONSISTENCIA: Rol principal es "' + user.rol_nombre + '" pero tiene proyectos como coordinador');
    }
    
    if (user.rol_nombre !== 'estudiante' && estudianteProjects.length > 0) {
      console.log('🚨 INCONSISTENCIA: Rol principal es "' + user.rol_nombre + '" pero tiene proyectos como estudiante');
    }

    // Conclusión
    console.log('\n🎯 CONCLUSIÓN:');
    if (user.rol_nombre === 'coordinador') {
      console.log('✅ El usuario ES COORDINADOR según su rol principal en el sistema');
    } else if (user.rol_nombre === 'estudiante') {
      console.log('✅ El usuario ES ESTUDIANTE según su rol principal en el sistema');
    } else {
      console.log('ℹ️  El usuario tiene rol:', user.rol_nombre);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

verifyUserRole();