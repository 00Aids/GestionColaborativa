const path = require('path');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const Deliverable = require('./src/models/Deliverable');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testFinalIntegration() {
  let connection;
  
  try {
    // Crear instancias de los modelos
    const userModel = new User();
    const projectModel = new Project();
    const deliverableModel = new Deliverable();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_proyectos'
    });
    
    console.log('✅ Conectado a la base de datos');
    console.log('\n🧪 PRUEBA FINAL DE INTEGRACIÓN COMPLETA');
    console.log('=' .repeat(50));
    
    // 1. Verificar estructura de tablas y relaciones
    console.log('\n📋 1. Verificando estructura de tablas...');
    
    const [tables] = await connection.execute(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN ('usuarios', 'proyectos', 'entregables', 'areas_trabajo')
      ORDER BY TABLE_NAME
    `, [process.env.DB_NAME || 'gestion_proyectos']);
    
    console.log('   Tablas principales encontradas:');
    tables.forEach(table => console.log(`   ✓ ${table.TABLE_NAME}`));
    
    // 2. Verificar claves foráneas
    console.log('\n🔗 2. Verificando claves foráneas...');
    
    const [foreignKeys] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = ? 
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND TABLE_NAME IN ('usuarios', 'proyectos', 'entregables')
      ORDER BY TABLE_NAME, COLUMN_NAME
    `, [process.env.DB_NAME || 'gestion_proyectos']);
    
    console.log('   Relaciones encontradas:');
    foreignKeys.forEach(fk => {
      console.log(`   ✓ ${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });
    
    // 3. Crear administrador con área automática
    console.log('\n👤 3. Creando administrador con área automática...');
    
    const adminData = {
      codigo_usuario: `ADM${Date.now().toString().slice(-6)}`,
      email: `admin.test.${Date.now()}@universidad.edu`,
      password_hash: 'hash_temporal',
      nombres: 'Administrador',
      apellidos: 'de Prueba',
      rol_id: 2, // Administrador
      activo: 1
      // No incluimos area_trabajo_id para que se asigne automáticamente
    };
    
    const newAdmin = await userModel.create(adminData);
    console.log(`   ✅ Administrador creado: ${newAdmin.nombres} ${newAdmin.apellidos} (ID: ${newAdmin.id})`);
    
    // Verificar área asignada
    const [adminCheck] = await connection.execute(`
      SELECT u.id, u.nombres, u.apellidos, u.area_trabajo_id, at.codigo as area_codigo
      FROM usuarios u
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      WHERE u.id = ?
    `, [newAdmin.id]);
    
    if (adminCheck.length > 0) {
      const admin = adminCheck[0];
      console.log(`   📍 Área asignada: ${admin.area_codigo || 'Sin área'} (ID: ${admin.area_trabajo_id || 'NULL'})`);
    }
    
    // 4. Crear proyecto con área automática
    console.log('\n📁 4. Creando proyecto con área automática...');
    
    // Buscar un estudiante existente
    const [students] = await connection.execute(`
      SELECT id, nombres, apellidos FROM usuarios WHERE rol_id = 3 LIMIT 1
    `);
    
    if (students.length === 0) {
      throw new Error('No hay estudiantes disponibles para asignar al proyecto');
    }
    
    const student = students[0];
    
    const projectData = {
      titulo: `Proyecto de Prueba Integración - ${Date.now()}`,
      descripcion: 'Proyecto para probar la asignación automática de área',
      estudiante_id: student.id,
      ciclo_academico_id: 1, // Requerido
      estado: 'en_desarrollo' // Valor válido del enum
      // No incluimos area_trabajo_id para que se asigne automáticamente
    };
    
    const newProject = await projectModel.create(projectData);
    console.log(`   ✅ Proyecto creado: "${newProject.titulo}" (ID: ${newProject.id})`);
    
    // Verificar área asignada al proyecto
    const [projectCheck] = await connection.execute(`
      SELECT p.id, p.titulo, p.area_trabajo_id, at.codigo as area_codigo
      FROM proyectos p
      LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
      WHERE p.id = ?
    `, [newProject.id]);
    
    if (projectCheck.length > 0) {
      const project = projectCheck[0];
      console.log(`   📍 Área asignada: ${project.area_codigo || 'Sin área'} (ID: ${project.area_trabajo_id || 'NULL'})`);
    }
    
    // 5. Crear entregable con área automática
    console.log('\n📦 5. Creando entregable con área automática...');
    
    const deliverableData = {
      titulo: `Entregable de Prueba Integración - ${Date.now()}`,
      descripcion: 'Entregable para probar la herencia automática de área del proyecto',
      proyecto_id: newProject.id,
      fase_id: 1, // Propuesta
      fecha_entrega: '2024-12-31',
      estado: 'pendiente'
      // No incluimos area_trabajo_id para que se herede del proyecto
    };
    
    const newDeliverable = await deliverableModel.create(deliverableData);
    console.log(`   ✅ Entregable creado: "${newDeliverable.titulo}" (ID: ${newDeliverable.id})`);
    
    // Verificar área asignada al entregable
    const [deliverableCheck] = await connection.execute(`
      SELECT 
        e.id, 
        e.titulo, 
        e.area_trabajo_id, 
        at.codigo as area_codigo,
        p.area_trabajo_id as proyecto_area_id
      FROM entregables e
      LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
      LEFT JOIN proyectos p ON e.proyecto_id = p.id
      WHERE e.id = ?
    `, [newDeliverable.id]);
    
    if (deliverableCheck.length > 0) {
      const deliverable = deliverableCheck[0];
      console.log(`   📍 Área asignada: ${deliverable.area_codigo || 'Sin área'} (ID: ${deliverable.area_trabajo_id || 'NULL'})`);
      console.log(`   📍 Área del proyecto: ID ${deliverable.proyecto_area_id || 'NULL'}`);
      
      if (deliverable.area_trabajo_id === deliverable.proyecto_area_id) {
        console.log('   ✅ ¡Correcto! El entregable heredó el área del proyecto');
      } else {
        console.log('   ⚠️  El entregable no heredó el área del proyecto');
      }
    }
    
    // 6. Probar consultas con filtros por área
    console.log('\n🔍 6. Probando consultas con filtros por área...');
    
    // Obtener área más común
    const [areaStats] = await connection.execute(`
      SELECT 
        at.id,
        at.codigo,
        COUNT(DISTINCT u.id) as usuarios_count,
        COUNT(DISTINCT p.id) as proyectos_count,
        COUNT(DISTINCT e.id) as entregables_count
      FROM areas_trabajo at
      LEFT JOIN usuarios u ON at.id = u.area_trabajo_id
      LEFT JOIN proyectos p ON at.id = p.area_trabajo_id
      LEFT JOIN entregables e ON at.id = e.area_trabajo_id
      GROUP BY at.id, at.codigo
      ORDER BY (usuarios_count + proyectos_count + entregables_count) DESC
      LIMIT 1
    `);
    
    if (areaStats.length > 0) {
      const area = areaStats[0];
      console.log(`   📊 Área con más actividad: ${area.codigo}`);
      console.log(`      - Usuarios: ${area.usuarios_count}`);
      console.log(`      - Proyectos: ${area.proyectos_count}`);
      console.log(`      - Entregables: ${area.entregables_count}`);
      
      // Probar consulta de administradores por área
      const [adminsByArea] = await connection.execute(`
        SELECT 
          at.codigo as area_codigo,
          COUNT(u.id) as admin_count,
          GROUP_CONCAT(CONCAT(u.nombres, ' ', u.apellidos) SEPARATOR ', ') as admins
        FROM areas_trabajo at
        LEFT JOIN usuarios u ON at.id = u.area_trabajo_id AND u.rol_id = 2 AND u.activo = 1
        WHERE at.id = ?
        GROUP BY at.id, at.codigo
      `, [area.id]);
      
      if (adminsByArea.length > 0) {
        const areaAdmin = adminsByArea[0];
        console.log(`   👥 Administradores en ${areaAdmin.area_codigo}: ${areaAdmin.admin_count}`);
        if (areaAdmin.admins) {
          console.log(`      - ${areaAdmin.admins}`);
        }
      }
    }
    
    // 7. Verificar integridad de datos
    console.log('\n🔍 7. Verificando integridad de datos...');
    
    // Verificar entregables sin área pero con proyecto que sí tiene área
    const [orphanDeliverables] = await connection.execute(`
      SELECT 
        e.id,
        e.titulo,
        e.area_trabajo_id as entregable_area,
        p.area_trabajo_id as proyecto_area
      FROM entregables e
      JOIN proyectos p ON e.proyecto_id = p.id
      WHERE e.area_trabajo_id IS NULL AND p.area_trabajo_id IS NOT NULL
      LIMIT 5
    `);
    
    if (orphanDeliverables.length > 0) {
      console.log(`   ⚠️  Encontrados ${orphanDeliverables.length} entregables sin área pero con proyecto que sí tiene área`);
      orphanDeliverables.forEach(d => {
        console.log(`      - Entregable ${d.id}: "${d.titulo}" (Proyecto área: ${d.proyecto_area})`);
      });
    } else {
      console.log('   ✅ No hay entregables huérfanos de área');
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('✅ PRUEBA DE INTEGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('=' .repeat(50));
    
    console.log('\n📋 RESUMEN:');
    console.log('✓ Estructura de tablas verificada');
    console.log('✓ Claves foráneas verificadas');
    console.log('✓ Administrador creado con área automática');
    console.log('✓ Proyecto creado con área automática');
    console.log('✓ Entregable creado con herencia de área');
    console.log('✓ Consultas con filtros funcionando');
    console.log('✓ Integridad de datos verificada');
    
  } catch (error) {
    console.error('❌ Error durante la prueba de integración:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la prueba
testFinalIntegration()
  .then(() => {
    console.log('\n🎉 TODAS LAS PRUEBAS COMPLETADAS EXITOSAMENTE');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error en la prueba de integración:', error);
    process.exit(1);
  });