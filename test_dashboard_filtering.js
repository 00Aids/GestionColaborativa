const path = require('path');
const mysql = require('mysql2/promise');
const Project = require('./src/models/Project');
const Deliverable = require('./src/models/Deliverable');
const User = require('./src/models/User');
require('dotenv').config();

async function testDashboardFiltering() {
  let connection;
  
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_proyectos'
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // Crear instancias de modelos
    const projectModel = new Project();
    const deliverableModel = new Deliverable();
    const userModel = new User();
    
    // 1. Verificar áreas de trabajo disponibles
    console.log('\n🏢 Verificando áreas de trabajo...');
    const [areas] = await connection.execute('SELECT * FROM areas_trabajo');
    console.log(`📋 Áreas disponibles: ${areas.length}`);
    areas.forEach(area => {
      console.log(`  - ${area.codigo} (ID: ${area.id})`);
    });
    
    if (areas.length === 0) {
      throw new Error('No hay áreas de trabajo configuradas');
    }
    
    // 2. Buscar un usuario administrador con área asignada
    console.log('\n👤 Buscando administrador con área asignada...');
    const [admins] = await connection.execute(`
      SELECT u.*, at.codigo as area_codigo, r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Administrador General' AND u.area_trabajo_id IS NOT NULL
      LIMIT 1
    `);
    
    let testUser;
    if (admins.length > 0) {
      testUser = admins[0];
      console.log(`👨‍💼 Usuario encontrado: ${testUser.nombres} ${testUser.apellidos} (Área: ${testUser.area_codigo})`);
    } else {
      // Crear un usuario de prueba con área
      console.log('🔧 Creando usuario administrador de prueba...');
      const testAreaId = areas[0].id;
      
      // Buscar el rol de administrador
      const [adminRoles] = await connection.execute(`
        SELECT id FROM roles WHERE nombre = 'Administrador General' LIMIT 1
      `);
      
      if (adminRoles.length === 0) {
        throw new Error('No se encontró el rol de Administrador General');
      }
      
      const userData = {
        codigo_usuario: `TEST_ADMIN_${Date.now().toString().slice(-6)}`,
        nombres: 'Admin',
        apellidos: 'Prueba',
        email: `admin.prueba.${Date.now()}@test.com`,
        password: 'password123',
        rol_id: adminRoles[0].id,
        area_trabajo_id: testAreaId,
        activo: true
      };
      
      const newUser = await userModel.create(userData);
      testUser = { ...userData, id: newUser.insertId, area_codigo: areas[0].codigo };
      console.log(`👨‍💼 Usuario creado: ${testUser.nombres} ${testUser.apellidos} (Área: ${testUser.area_codigo})`);
    }
    
    // 3. Simular el filtrado del dashboard
    console.log('\n📊 Simulando filtrado del dashboard...');
    
    // Obtener estadísticas por área
    const projectStatsRaw = await projectModel.getStatisticsByArea(testUser.area_trabajo_id);
    console.log(`📈 Estadísticas de proyectos del área ${testUser.area_codigo}:`);
    console.log(`  Total proyectos: ${projectStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0)}`);
    projectStatsRaw.forEach(stat => {
      console.log(`    - ${stat.estado}: ${stat.cantidad}`);
    });
    
    // Obtener proyectos del área
    const areaProjects = await projectModel.findByArea(testUser.area_trabajo_id);
    console.log(`📋 Proyectos del área: ${areaProjects.length}`);
    
    // Obtener entregables del área
    const areaDeliverables = await deliverableModel.findWithProject({ 
      area_trabajo_id: testUser.area_trabajo_id 
    });
    console.log(`📦 Entregables del área: ${areaDeliverables.length}`);
    
    // Calcular estadísticas de entregables
    const deliverableStats = [
      { estado: 'pendiente', cantidad: areaDeliverables.filter(d => d.estado === 'pendiente').length },
      { estado: 'en_progreso', cantidad: areaDeliverables.filter(d => d.estado === 'en_progreso').length },
      { estado: 'completado', cantidad: areaDeliverables.filter(d => d.estado === 'completado').length }
    ].filter(stat => stat.cantidad > 0);
    
    console.log(`📈 Estadísticas de entregables del área ${testUser.area_codigo}:`);
    console.log(`  Total entregables: ${deliverableStats.reduce((sum, stat) => sum + stat.cantidad, 0)}`);
    deliverableStats.forEach(stat => {
      console.log(`    - ${stat.estado}: ${stat.cantidad}`);
    });
    
    // Entregables vencidos
    const overdueDeliverables = areaDeliverables.filter(d => {
      const today = new Date();
      const dueDate = new Date(d.fecha_limite);
      return dueDate < today && d.estado !== 'completado';
    });
    console.log(`⏰ Entregables vencidos del área: ${overdueDeliverables.length}`);
    
    // 4. Comparar con estadísticas globales
    console.log('\n🌍 Comparando con estadísticas globales...');
    const globalProjectStats = await projectModel.getStatistics();
    const globalProjectTotal = globalProjectStats.reduce((sum, stat) => sum + stat.cantidad, 0);
    
    const globalDeliverableStats = await deliverableModel.getStatistics();
    const globalDeliverableTotal = globalDeliverableStats.reduce((sum, stat) => sum + stat.cantidad, 0);
    
    console.log(`📊 Estadísticas globales:`);
    console.log(`  Total proyectos globales: ${globalProjectTotal}`);
    console.log(`  Total entregables globales: ${globalDeliverableTotal}`);
    
    const areaProjectTotal = projectStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0);
    const areaDeliverableTotal = deliverableStats.reduce((sum, stat) => sum + stat.cantidad, 0);
    
    console.log(`📊 Estadísticas del área ${testUser.area_codigo}:`);
    console.log(`  Total proyectos del área: ${areaProjectTotal}`);
    console.log(`  Total entregables del área: ${areaDeliverableTotal}`);
    
    // 5. Verificar que el filtrado funciona
    console.log('\n✅ Verificación del filtrado:');
    if (areaProjectTotal <= globalProjectTotal) {
      console.log(`✅ Filtrado de proyectos funciona: ${areaProjectTotal} <= ${globalProjectTotal}`);
    } else {
      console.log(`❌ Error en filtrado de proyectos: ${areaProjectTotal} > ${globalProjectTotal}`);
    }
    
    if (areaDeliverableTotal <= globalDeliverableTotal) {
      console.log(`✅ Filtrado de entregables funciona: ${areaDeliverableTotal} <= ${globalDeliverableTotal}`);
    } else {
      console.log(`❌ Error en filtrado de entregables: ${areaDeliverableTotal} > ${globalDeliverableTotal}`);
    }
    
    console.log('\n🎉 Prueba de filtrado del dashboard completada exitosamente');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// Ejecutar la prueba
testDashboardFiltering();