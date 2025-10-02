const mysql = require('mysql2/promise');
const User = require('./src/models/User');
const Project = require('./src/models/Project');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'gestion_academica'
};

async function testStudentProjectAccess() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');

    console.log('\n=== PRUEBA DE ACCESO DE ESTUDIANTE A PROYECTO ===\n');

    // 1. Buscar un estudiante existente
    console.log('1. Buscando estudiantes en el sistema...');
    const [students] = await connection.execute(`
      SELECT u.*, r.nombre as rol_nombre
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre LIKE '%Estudiante%' AND u.activo = 1
      LIMIT 3
    `);

    if (students.length === 0) {
      console.log('❌ No hay estudiantes en el sistema');
      return;
    }

    console.log(`✅ ${students.length} estudiantes encontrados:`);
    students.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.nombres} ${student.apellidos} (${student.email})`);
    });

    const testStudent = students[0];
    console.log(`\n🎯 Usando estudiante de prueba: ${testStudent.nombres} ${testStudent.apellidos}`);

    // 2. Verificar áreas del estudiante
    console.log('\n2. Verificando áreas del estudiante...');
    const userModel = new User();
    const studentAreas = await userModel.getUserAreas(testStudent.id);
    
    console.log(`   Áreas asignadas: ${studentAreas.length}`);
    studentAreas.forEach(area => {
      console.log(`      - ${area.area_nombre} (ID: ${area.area_trabajo_id})`);
    });

    const studentAreaId = studentAreas.length > 0 ? studentAreas[0].area_trabajo_id : null;

    // 3. Buscar proyectos disponibles
    console.log('\n3. Buscando proyectos en el sistema...');
    const [projects] = await connection.execute(`
      SELECT p.*, a.nombre as area_nombre, a.codigo as area_codigo
      FROM proyectos p
      INNER JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      WHERE p.activo = 1
      ORDER BY p.id DESC
      LIMIT 3
    `);

    if (projects.length === 0) {
      console.log('❌ No hay proyectos en el sistema');
      return;
    }

    console.log(`✅ ${projects.length} proyectos encontrados:`);
    projects.forEach((project, index) => {
      console.log(`   ${index + 1}. "${project.nombre}" - Área: ${project.area_nombre} (ID: ${project.area_trabajo_id})`);
    });

    // 4. Probar acceso a cada proyecto
    for (const project of projects) {
      console.log(`\n--- Probando acceso al proyecto: "${project.nombre}" ---`);
      console.log(`    Área del proyecto: ${project.area_nombre} (ID: ${project.area_trabajo_id})`);
      console.log(`    Área del estudiante: ${studentAreaId || 'No asignada'}`);

      // Verificar si el estudiante es miembro del proyecto
      const [memberCheck] = await connection.execute(`
        SELECT * FROM proyecto_usuarios 
        WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'
      `, [project.id, testStudent.id]);

      const isProjectMember = memberCheck.length > 0;
      console.log(`    Es miembro del proyecto: ${isProjectMember ? '✅ Sí' : '❌ No'}`);

      // Verificar si pertenece al área del proyecto
      const belongsToProjectArea = studentAreaId === project.area_trabajo_id;
      console.log(`    Pertenece al área del proyecto: ${belongsToProjectArea ? '✅ Sí' : '❌ No'}`);

      // Simular la lógica de permisos del controlador
      const isMainStudent = studentAreaId === project.area_trabajo_id;
      const hasAccess = isMainStudent || isProjectMember;

      console.log(`    🎯 RESULTADO: ${hasAccess ? '✅ ACCESO PERMITIDO' : '❌ ACCESO DENEGADO'}`);

      if (!hasAccess) {
        console.log(`    💡 Para dar acceso:`);
        if (!belongsToProjectArea) {
          console.log(`       - Asignar estudiante al área "${project.area_nombre}"`);
        }
        if (!isProjectMember) {
          console.log(`       - Agregar estudiante como miembro del proyecto`);
        }
      }
    }

    // 5. Simular agregar el estudiante a un proyecto
    const targetProject = projects[0];
    console.log(`\n5. Simulando agregar estudiante al proyecto "${targetProject.nombre}"...`);

    // Verificar si ya es miembro
    const [existingMember] = await connection.execute(`
      SELECT * FROM proyecto_usuarios 
      WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'
    `, [targetProject.id, testStudent.id]);

    if (existingMember.length === 0) {
      // Agregar como miembro del proyecto
      await connection.execute(`
        INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, estado)
        VALUES (?, ?, 'estudiante', 'activo')
      `, [targetProject.id, testStudent.id]);
      console.log(`   ✅ Estudiante agregado como miembro del proyecto`);
    } else {
      console.log(`   ℹ️  Estudiante ya es miembro del proyecto`);
    }

    // Verificar si pertenece al área del proyecto
    const belongsToArea = await userModel.belongsToArea(testStudent.id, targetProject.area_trabajo_id);
    
    if (!belongsToArea) {
      // Agregar al área del proyecto
      await userModel.assignToArea(testStudent.id, targetProject.area_trabajo_id, false, false);
      console.log(`   ✅ Estudiante agregado al área "${targetProject.area_nombre}"`);
    } else {
      console.log(`   ℹ️  Estudiante ya pertenece al área del proyecto`);
    }

    // 6. Verificar acceso después de las correcciones
    console.log(`\n6. Verificando acceso después de las correcciones...`);
    
    const updatedAreas = await userModel.getUserAreas(testStudent.id);
    const newStudentAreaId = updatedAreas.find(area => area.area_trabajo_id === targetProject.area_trabajo_id)?.area_trabajo_id;
    
    const [updatedMemberCheck] = await connection.execute(`
      SELECT * FROM proyecto_usuarios 
      WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'
    `, [targetProject.id, testStudent.id]);

    const isNowMember = updatedMemberCheck.length > 0;
    const belongsToProjectAreaNow = newStudentAreaId === targetProject.area_trabajo_id;
    const hasAccessNow = belongsToProjectAreaNow || isNowMember;

    console.log(`   Es miembro del proyecto: ${isNowMember ? '✅ Sí' : '❌ No'}`);
    console.log(`   Pertenece al área del proyecto: ${belongsToProjectAreaNow ? '✅ Sí' : '❌ No'}`);
    console.log(`   🎯 ACCESO FINAL: ${hasAccessNow ? '✅ PERMITIDO' : '❌ DENEGADO'}`);

    console.log('\n=== RESUMEN ===');
    console.log(`✅ Estudiante: ${testStudent.nombres} ${testStudent.apellidos}`);
    console.log(`✅ Proyecto: ${targetProject.nombre}`);
    console.log(`✅ Área del proyecto: ${targetProject.area_nombre}`);
    console.log(`✅ Acceso configurado correctamente: ${hasAccessNow ? 'SÍ' : 'NO'}`);

    if (hasAccessNow) {
      console.log('\n🎉 El estudiante ahora puede acceder al proyecto!');
      console.log(`🔗 URL del proyecto: http://localhost:3000/projects/${targetProject.id}`);
    }

  } catch (error) {
    console.error('❌ Error en la prueba:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n✅ Conexión cerrada');
    }
  }
}

// Ejecutar la prueba
testStudentProjectAccess().catch(console.error);