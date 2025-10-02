const { pool } = require('./src/config/database');
const Deliverable = require('./src/models/Deliverable');

async function testDeliverablesAPI() {
  try {
    console.log('🔍 Probando la API de entregables para proyecto 35...');
    
    // Instanciar el modelo
    const deliverableModel = new Deliverable();
    
    // 1. Verificar entregables directamente en la base de datos
    console.log('\n📋 1. Verificando entregables en la base de datos:');
    const [dbDeliverables] = await pool.execute(
      'SELECT * FROM entregables WHERE proyecto_id = 35'
    );
    console.log(`   Encontrados: ${dbDeliverables.length} entregables`);
    
    if (dbDeliverables.length > 0) {
      dbDeliverables.forEach((d, i) => {
        console.log(`   ${i+1}. ${d.titulo} - Estado: ${d.estado} - Fecha: ${d.fecha_entrega}`);
      });
    }
    
    // 2. Probar el método findByProject del modelo
    console.log('\n🔧 2. Probando método findByProject del modelo:');
    try {
      const modelDeliverables = await deliverableModel.findByProject(35);
      console.log(`   Resultado del modelo: ${modelDeliverables.length} entregables`);
      
      if (modelDeliverables.length > 0) {
        modelDeliverables.forEach((d, i) => {
          console.log(`   ${i+1}. ${d.titulo} - Estado: ${d.estado} - Proyecto: ${d.proyecto_titulo}`);
        });
      }
    } catch (error) {
      console.error('   ❌ Error en findByProject:', error.message);
    }
    
    // 3. Probar la consulta SQL exacta que usa findWithProject
    console.log('\n🔍 3. Probando consulta SQL directa:');
    try {
      const query = `
        SELECT 
          e.*,
          p.titulo as proyecto_titulo,
          p.estado as proyecto_estado,
          u.nombres as estudiante_nombres,
          u.apellidos as estudiante_apellidos,
          fp.nombre as fase_nombre,
          fp.descripcion as fase_descripcion,
          at.codigo as area_trabajo_codigo
        FROM entregables e
        LEFT JOIN proyectos p ON e.proyecto_id = p.id
        LEFT JOIN usuarios u ON p.estudiante_id = u.id
        LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
        LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
        WHERE 1=1 AND e.proyecto_id = ?
        ORDER BY e.fecha_entrega ASC
      `;
      
      const [sqlDeliverables] = await pool.execute(query, [35]);
      console.log(`   Resultado SQL directo: ${sqlDeliverables.length} entregables`);
      
      if (sqlDeliverables.length > 0) {
        sqlDeliverables.forEach((d, i) => {
          console.log(`   ${i+1}. ${d.titulo} - Estado: ${d.estado}`);
          console.log(`       Proyecto: ${d.proyecto_titulo}`);
          console.log(`       Fase: ${d.fase_nombre || 'Sin fase'}`);
          console.log(`       Área: ${d.area_trabajo_codigo || 'Sin área'}`);
        });
      }
    } catch (error) {
      console.error('   ❌ Error en consulta SQL:', error.message);
    }
    
    // 4. Verificar las tablas relacionadas
    console.log('\n🔗 4. Verificando tablas relacionadas:');
    
    // Verificar proyecto
    const [project] = await pool.execute('SELECT * FROM proyectos WHERE id = 35');
    if (project.length > 0) {
      console.log(`   ✅ Proyecto 35 existe: ${project[0].titulo}`);
      console.log(`   Estudiante ID: ${project[0].estudiante_id}`);
      console.log(`   Área trabajo ID: ${project[0].area_trabajo_id}`);
    } else {
      console.log('   ❌ Proyecto 35 no existe');
    }
    
    // Verificar fases_proyecto
    const [fases] = await pool.execute('SELECT * FROM fases_proyecto LIMIT 3');
    console.log(`   Fases disponibles: ${fases.length}`);
    
    // Verificar areas_trabajo
    const [areas] = await pool.execute('SELECT * FROM areas_trabajo LIMIT 3');
    console.log(`   Áreas disponibles: ${areas.length}`);
    
  } catch (error) {
    console.error('❌ Error general:', error);
  } finally {
    process.exit(0);
  }
}

testDeliverablesAPI();