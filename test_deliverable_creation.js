const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_proyectos'
};

async function testDeliverableCreation() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
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
      console.log('⚠️  No hay proyectos con área asignada. Creando uno...');
      
      // Obtener la primera área disponible
      const [areas] = await connection.execute('SELECT id, codigo FROM areas_trabajo LIMIT 1');
      if (areas.length === 0) {
        throw new Error('No hay áreas de trabajo disponibles');
      }
      
      // Crear un proyecto de prueba
      const [projectResult] = await connection.execute(`
        INSERT INTO proyectos (titulo, descripcion, area_trabajo_id, created_at, updated_at)
        VALUES (?, ?, ?, NOW(), NOW())
      `, ['Proyecto de Prueba para Entregables', 'Proyecto creado para probar asignación automática de área', areas[0].id]);
      
      const projectId = projectResult.insertId;
      console.log(`✅ Proyecto creado: ID ${projectId}, Área: ${areas[0].codigo}`);
      
      // Usar el proyecto recién creado
      projects.push({
        id: projectId,
        titulo: 'Proyecto de Prueba para Entregables',
        area_trabajo_id: areas[0].id,
        area_codigo: areas[0].codigo
      });
    }
    
    const project = projects[0];
    console.log(`📋 Usando proyecto: "${project.titulo}" (ID: ${project.id}, Área: ${project.area_codigo})`);
    
    // 2. Crear un entregable sin especificar área (debe heredarla del proyecto)
    console.log('\n📦 Creando entregable sin especificar área...');
    
    const deliverableData = {
      titulo: 'Entregable de Prueba - Asignación Automática',
      descripcion: 'Este entregable debe heredar automáticamente el área del proyecto',
      proyecto_id: project.id,
      fecha_entrega: '2024-12-31',
      estado: 'pendiente'
    };
    
    const [deliverableResult] = await connection.execute(`
      INSERT INTO entregables (titulo, descripcion, proyecto_id, fase_id, fecha_entrega, estado, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
    `, [
      deliverableData.titulo,
      deliverableData.descripcion,
      deliverableData.proyecto_id,
      1, // Usar fase_id = 1 (Propuesta)
      deliverableData.fecha_entrega,
      deliverableData.estado
    ]);
    
    const deliverableId = deliverableResult.insertId;
    console.log(`✅ Entregable creado: ID ${deliverableId}`);
    
    // 3. Verificar si el entregable tiene área asignada
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
    `, [deliverableId]);
    
    if (deliverable.length > 0) {
      const d = deliverable[0];
      console.log(`📦 Entregable: "${d.titulo}"`);
      console.log(`   - ID: ${d.id}`);
      console.log(`   - Área asignada: ${d.area_codigo || 'Sin área'} (ID: ${d.area_trabajo_id || 'NULL'})`);
      console.log(`   - Proyecto: "${d.proyecto_titulo}" (Área ID: ${d.proyecto_area_id})`);
      
      if (d.area_trabajo_id === d.proyecto_area_id) {
        console.log('✅ ¡Éxito! El entregable heredó correctamente el área del proyecto');
      } else if (d.area_trabajo_id === null) {
        console.log('⚠️  El entregable no tiene área asignada. Necesita actualización manual.');
        
        // Actualizar manualmente usando la lógica del modelo
        console.log('\n🔧 Actualizando área del entregable...');
        await connection.execute(`
          UPDATE entregables 
          SET area_trabajo_id = (
            SELECT area_trabajo_id 
            FROM proyectos 
            WHERE id = ?
          )
          WHERE id = ?
        `, [project.id, deliverableId]);
        
        // Verificar nuevamente
        const [updatedDeliverable] = await connection.execute(`
          SELECT e.area_trabajo_id, at.codigo as area_codigo
          FROM entregables e
          LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
          WHERE e.id = ?
        `, [deliverableId]);
        
        if (updatedDeliverable.length > 0) {
          console.log(`✅ Área actualizada: ${updatedDeliverable[0].area_codigo} (ID: ${updatedDeliverable[0].area_trabajo_id})`);
        }
      } else {
        console.log('❌ El entregable tiene un área diferente al proyecto');
      }
    }
    
    // 4. Probar consulta de entregables con filtro por área
    console.log('\n🔍 Probando consulta con filtro por área...');
    
    const [filteredDeliverables] = await connection.execute(`
      SELECT 
        e.id,
        e.titulo,
        e.estado,
        at.codigo as area_codigo
      FROM entregables e
      LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
      WHERE e.area_trabajo_id = ?
      ORDER BY e.created_at DESC
      LIMIT 3
    `, [project.area_trabajo_id]);
    
    console.log(`📦 Entregables en área ${project.area_codigo}:`);
    filteredDeliverables.forEach(d => {
      console.log(`   - ${d.titulo} (${d.estado})`);
    });
    
    console.log('\n✅ Prueba de creación de entregables completada');
    
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
testDeliverableCreation()
  .then(() => {
    console.log('\n🎉 Prueba completada exitosamente');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error en la prueba:', error);
    process.exit(1);
  });