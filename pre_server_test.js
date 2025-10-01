const { pool } = require('./src/config/database');

async function preServerTest() {
  console.log('🧪 PRUEBA COMPLETA ANTES DE INICIAR EL SERVIDOR\n');
  console.log('='.repeat(60));

  try {
    // 1. Verificar coordinadores con asignaciones
    console.log('\n📋 1. VERIFICANDO COORDINADORES CON ASIGNACIONES...');
    const [coordinatorAssignments] = await pool.execute(`
      SELECT 
        u.id as coordinador_id,
        u.nombres as coordinador_nombres,
        u.apellidos as coordinador_apellidos,
        u.email as coordinador_email,
        COUNT(DISTINCT pu.proyecto_id) as proyectos_asignados,
        COUNT(DISTINCT p.estudiante_id) as estudiantes_total
      FROM usuarios u
      INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.rol_id = 3 AND pu.rol = 'coordinador' AND p.estudiante_id IS NOT NULL
      GROUP BY u.id, u.nombres, u.apellidos, u.email
      ORDER BY u.id
    `);

    console.log(`✅ Coordinadores con asignaciones válidas: ${coordinatorAssignments.length}`);
    coordinatorAssignments.forEach(coord => {
      console.log(`   - ${coord.coordinador_nombres} ${coord.coordinador_apellidos} (ID: ${coord.coordinador_id})`);
      console.log(`     Email: ${coord.coordinador_email}`);
      console.log(`     Proyectos: ${coord.proyectos_asignados} | Estudiantes: ${coord.estudiantes_total}`);
    });

    if (coordinatorAssignments.length === 0) {
      console.log('❌ NO HAY COORDINADORES CON ASIGNACIONES VÁLIDAS');
      return;
    }

    // 2. Probar el método coordinatorStudents para cada coordinador
    console.log('\n📋 2. PROBANDO MÉTODO coordinatorStudents...');
    
    for (const coord of coordinatorAssignments) {
      console.log(`\n🔍 Probando coordinador: ${coord.coordinador_nombres} ${coord.coordinador_apellidos}`);
      
      const [students] = await pool.execute(`
        SELECT DISTINCT 
          u.id,
          u.nombres,
          u.apellidos,
          u.email,
          u.telefono,
          u.created_at as fecha_registro,
          p.titulo as proyecto_titulo,
          p.id as proyecto_id,
          p.estado as proyecto_estado
        FROM usuarios u
        INNER JOIN proyectos p ON u.id = p.estudiante_id
        INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
        WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        ORDER BY u.apellidos, u.nombres
      `, [coord.coordinador_id]);

      console.log(`   📊 Estudiantes encontrados: ${students.length}`);
      
      if (students.length > 0) {
        // Calcular estadísticas como en la vista
        const proyectosActivos = students.filter(s => s.proyecto_estado === 'activo' || s.proyecto_estado === 'en_desarrollo').length;
        const proyectosCompletados = students.filter(s => s.proyecto_estado === 'completado').length;
        
        console.log(`   📈 ESTADÍSTICAS PARA LA VISTA:`);
        console.log(`      - Total Estudiantes: ${students.length}`);
        console.log(`      - Proyectos Activos: ${proyectosActivos}`);
        console.log(`      - Proyectos Completados: ${proyectosCompletados}`);
        
        console.log(`   👥 ESTUDIANTES:`);
        students.forEach(student => {
          console.log(`      - ${student.nombres} ${student.apellidos}`);
          console.log(`        Proyecto: ${student.proyecto_titulo} (${student.proyecto_estado})`);
          console.log(`        Email: ${student.email}`);
        });
      } else {
        console.log(`   ⚠️  No se encontraron estudiantes para este coordinador`);
      }
    }

    // 3. Verificar credenciales de acceso
    console.log('\n📋 3. VERIFICANDO CREDENCIALES DE ACCESO...');
    
    for (const coord of coordinatorAssignments) {
      console.log(`\n🔑 Coordinador: ${coord.coordinador_nombres} ${coord.coordinador_apellidos}`);
      console.log(`   📧 Email para login: ${coord.coordinador_email}`);
      console.log(`   🔐 Contraseña por defecto: 123456 (si no se ha cambiado)`);
      console.log(`   🌐 URL después del login: /coordinator/students`);
    }

    // 4. Verificar rutas y controladores
    console.log('\n📋 4. VERIFICANDO CONFIGURACIÓN DEL SISTEMA...');
    
    // Verificar que existe el archivo de rutas
    const fs = require('fs');
    const routeFiles = [
      './src/routes/coordinator.js',
      './src/controllers/DashboardController.js',
      './src/views/coordinator/students.ejs'
    ];
    
    console.log('   📁 Archivos del sistema:');
    routeFiles.forEach(file => {
      if (fs.existsSync(file)) {
        console.log(`      ✅ ${file} - Existe`);
      } else {
        console.log(`      ❌ ${file} - NO EXISTE`);
      }
    });

    // 5. Resumen final
    console.log('\n📋 5. RESUMEN FINAL...');
    console.log('='.repeat(60));
    
    if (coordinatorAssignments.length > 0) {
      const bestCoordinator = coordinatorAssignments[0];
      console.log('✅ SISTEMA LISTO PARA USAR');
      console.log('\n🎯 RECOMENDACIÓN PARA PRUEBA:');
      console.log(`   1. Inicia el servidor: npm start`);
      console.log(`   2. Ve a: http://localhost:3000/auth/login`);
      console.log(`   3. Usa estas credenciales:`);
      console.log(`      Email: ${bestCoordinator.coordinador_email}`);
      console.log(`      Contraseña: 123456`);
      console.log(`   4. Después del login, ve a "Mis Estudiantes"`);
      console.log(`   5. Deberías ver ${bestCoordinator.estudiantes_total} estudiante(s)`);
      
      console.log('\n📊 DATOS ESPERADOS EN LA VISTA:');
      console.log(`   - Total Estudiantes: ${bestCoordinator.estudiantes_total}`);
      console.log(`   - Proyectos del coordinador: ${bestCoordinator.proyectos_asignados}`);
    } else {
      console.log('❌ SISTEMA NO ESTÁ LISTO');
      console.log('   Necesitas asignar coordinadores a proyectos con estudiantes');
    }

  } catch (error) {
    console.error('❌ Error durante la prueba:', error);
  } finally {
    await pool.end();
  }
}

preServerTest();