const path = require('path');
const Deliverable = require('./src/models/Deliverable');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function testDeliverableModel() {
  let connection;
  
  try {
    // Crear instancia del modelo
    const deliverableModel = new Deliverable();
    
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_proyectos'
    });
    
    console.log('✅ Conectado a la base de datos');
    
    // 1. Buscar un proyecto que tenga área asignada
    console.log('\n🔍 Buscando proyecto con área asignada...');
    const [projects] = await connection.execute(`
      SELECT p.id, p.titulo, p.area_trabajo_id, at.codigo as area_codigo
      FROM proyectos p
      LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
      WHERE p.area_trabajo_id IS NOT NULL
      LIMIT 1
    `);
    
    if (projects.length === 0) {
      throw new Error('No hay proyectos con área asignada');
    }
    
    const project = projects[0];
    console.log(`📋 Usando proyecto: "${project.titulo}" (ID: ${project.id}, Área: ${project.area_codigo})`);
    
    // 2. Crear entregable usando el modelo (sin especificar área)
    console.log('\n📦 Creando entregable usando el modelo Deliverable...');
    
    const deliverableData = {
      titulo: 'Entregable de Prueba - Modelo Correcto',
      descripcion: 'Este entregable debe heredar automáticamente el área del proyecto usando el modelo',
      proyecto_id: project.id,
      fase_id: 1, // Propuesta
      fecha_entrega: '2024-12-31',
      estado: 'pendiente'
      // Nota: NO incluimos area_trabajo_id para que se asigne automáticamente
    };
    
    const newDeliverable = await deliverableModel.create(deliverableData);
    console.log(`✅ Entregable creado: ID ${newDeliverable.id}`);
    
    // 3. Verificar el entregable creado
    console.log('\n🔍 Verificando área asignada al entregable...');
    
    const [deliverable] = await connection.execute(`
      SELECT 
        e.id,
        e.titulo,
        e.area_trabajo_id,
        at.codigo as area_codigo,
        p.titulo as proyecto_titulo,
        p.area_trabajo_id as proyecto_area_id
      FROM entregables e
      LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
      LEFT JOIN proyectos p ON e.proyecto_id = p.id
      WHERE e.id = ?
    `, [newDeliverable.id]);
    
    if (deliverable.length > 0) {
      const d = deliverable[0];
      console.log(`📦 Entregable: "${d.titulo}"`);
      console.log(`   - ID: ${d.id}`);
      console.log(`   - Área asignada: ${d.area_codigo || 'Sin área'} (ID: ${d.area_trabajo_id || 'NULL'})`);
      console.log(`   - Proyecto: "${d.proyecto_titulo}" (Área ID: ${d.proyecto_area_id})`);
      
      if (d.area_trabajo_id === d.proyecto_area_id) {
        console.log('✅ ¡Éxito! El entregable heredó correctamente el área del proyecto');
      } else {
        console.log('❌ El entregable no heredó el área del proyecto');
      }
    }
    
    // 4. Probar consulta con filtro usando el modelo
    console.log('\n🔍 Probando consulta con filtro por área usando el modelo...');
    
    const filteredDeliverables = await deliverableModel.findWithProject({
      area_trabajo_id: project.area_trabajo_id
    });
    
    console.log(`📦 Entregables en área ${project.area_codigo} (usando modelo):`);
    filteredDeliverables.slice(0, 3).forEach(d => {
      console.log(`   - ${d.titulo} (${d.estado}) - Área: ${d.area_trabajo_codigo || 'Sin área'}`);
    });
    
    console.log('\n✅ Prueba del modelo Deliverable completada');
    
  } catch (error) {
    console.error('❌ Error durante la prueba:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la prueba
testDeliverableModel()
  .then(() => {
    console.log('\n🎉 Prueba completada exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error en la prueba:', error);
    process.exit(1);
  });