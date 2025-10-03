const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugCoordinatorDashboard() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'proyecto_grado'
    });

    console.log('🔍 DIAGNÓSTICO DEL DASHBOARD DE COORDINACIÓN\n');

    // 1. Verificar usuarios coordinadores
    console.log('📋 1. VERIFICANDO USUARIOS COORDINADORES:');
    const [coordinators] = await connection.execute(`
      SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, u.email, u.rol_id, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'coordinador'
    `);
    
    console.log(`   Coordinadores encontrados: ${coordinators.length}`);
    coordinators.forEach(coord => {
      console.log(`   - ID: ${coord.id}, Nombre: ${coord.nombre_completo}, Email: ${coord.email}`);
    });

    if (coordinators.length === 0) {
      console.log('❌ No se encontraron coordinadores en el sistema');
      return;
    }

    // 2. Verificar proyectos en general
    console.log('\n📁 2. VERIFICANDO PROYECTOS EN EL SISTEMA:');
    const [allProjects] = await connection.execute(`
      SELECT p.id, p.titulo, p.estado, p.coordinador_id
      FROM proyectos p
      ORDER BY p.id
    `);
    
    console.log(`   Proyectos totales: ${allProjects.length}`);
    allProjects.forEach(project => {
      console.log(`   - ID: ${project.id}, Título: ${project.titulo}, Estado: ${project.estado}, Coordinador ID: ${project.coordinador_id}`);
    });

    // 3. Verificar asignaciones en proyecto_usuarios
    console.log('\n🔗 3. VERIFICANDO ASIGNACIONES EN PROYECTO_USUARIOS:');
    const [projectUsers] = await connection.execute(`
      SELECT pu.proyecto_id, pu.usuario_id, pu.rol, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, p.titulo
      FROM proyecto_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE pu.rol = 'coordinador'
      ORDER BY pu.proyecto_id
    `);
    
    console.log(`   Asignaciones de coordinadores: ${projectUsers.length}`);
    projectUsers.forEach(assignment => {
      console.log(`   - Proyecto: ${assignment.titulo} (ID: ${assignment.proyecto_id})`);
      console.log(`     Coordinador: ${assignment.nombre_completo} (ID: ${assignment.usuario_id})`);
    });

    // 4. Verificar específicamente para juan florez valderrama
    console.log('\n👤 4. VERIFICANDO ESPECÍFICAMENTE PARA JUAN FLOREZ VALDERRAMA:');
    const [juanUser] = await connection.execute(`
      SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, u.email, u.rol_id, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE (u.nombres LIKE '%juan%' OR u.apellidos LIKE '%florez%') 
      OR u.email LIKE '%juan%'
    `);
    
    if (juanUser.length > 0) {
      const juan = juanUser[0];
      console.log(`   Usuario encontrado: ${juan.nombre_completo} (ID: ${juan.id})`);
      
      // Verificar proyectos donde juan es coordinador_id
      const [juanProjectsCoord] = await connection.execute(`
        SELECT p.id, p.titulo, p.estado
        FROM proyectos p
        WHERE p.coordinador_id = ?
      `, [juan.id]);
      
      console.log(`   Proyectos donde es coordinador_id: ${juanProjectsCoord.length}`);
      juanProjectsCoord.forEach(project => {
        console.log(`     - ${project.titulo} (ID: ${project.id}, Estado: ${project.estado})`);
      });
      
      // Verificar proyectos en proyecto_usuarios
      const [juanProjectsUsers] = await connection.execute(`
        SELECT p.id, p.titulo, p.estado, pu.rol
        FROM proyectos p
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
      `, [juan.id]);
      
      console.log(`   Proyectos en proyecto_usuarios: ${juanProjectsUsers.length}`);
      juanProjectsUsers.forEach(project => {
        console.log(`     - ${project.titulo} (ID: ${project.id}, Estado: ${project.estado})`);
      });
      
    } else {
      console.log('❌ No se encontró el usuario juan florez valderrama');
    }

    // 5. Verificar la consulta que usa el dashboard
    console.log('\n🔍 5. SIMULANDO CONSULTA DEL DASHBOARD:');
    
    // Buscar cualquier coordinador para probar
    if (coordinators.length > 0) {
      const testCoordinator = coordinators[0];
      console.log(`   Probando con coordinador: ${testCoordinator.nombre_completo} (ID: ${testCoordinator.id})`);
      
      // Consulta típica del dashboard
      const [dashboardProjects] = await connection.execute(`
        SELECT 
          p.id,
          p.titulo,
          p.descripcion,
          p.estado,
          p.fecha_propuesta as fecha_inicio,
          p.fecha_finalizacion as fecha_fin,
          COUNT(DISTINCT pu_estudiantes.usuario_id) as total_estudiantes,
          COUNT(DISTINCT e.id) as total_entregables
        FROM proyectos p
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        LEFT JOIN proyecto_usuarios pu_estudiantes ON p.id = pu_estudiantes.proyecto_id AND pu_estudiantes.rol = 'estudiante'
        LEFT JOIN entregables e ON p.id = e.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        GROUP BY p.id, p.titulo, p.descripcion, p.estado, p.fecha_propuesta, p.fecha_finalizacion
        ORDER BY p.fecha_propuesta DESC
      `, [testCoordinator.id]);
      
      console.log(`   Proyectos encontrados por la consulta del dashboard: ${dashboardProjects.length}`);
      dashboardProjects.forEach(project => {
        console.log(`     - ${project.titulo} (Estudiantes: ${project.total_estudiantes}, Entregables: ${project.total_entregables})`);
      });
    }

  } catch (error) {
    console.error('❌ Error durante el diagnóstico:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🚀 Iniciando diagnóstico del dashboard de coordinación...\n');
debugCoordinatorDashboard();