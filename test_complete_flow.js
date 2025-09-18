const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'gestion_proyectos'
};

async function testCompleteFlow() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');
    
    // 1. Verificar estructura de tablas
    console.log('\n📋 Verificando estructura de tablas...');
    
    // Verificar columnas en proyectos
    const [projectColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'proyectos'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('Columnas en tabla proyectos:');
    projectColumns.forEach(col => {
      if (col.COLUMN_NAME === 'area_trabajo_id') {
        console.log(`  ✅ ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    });
    
    // Verificar columnas en entregables
    const [deliverableColumns] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'entregables'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_NAME]);
    
    console.log('\nColumnas en tabla entregables:');
    deliverableColumns.forEach(col => {
      if (col.COLUMN_NAME === 'area_trabajo_id') {
        console.log(`  ✅ ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
      }
    });
    
    // 2. Verificar claves foráneas
    console.log('\n🔗 Verificando claves foráneas...');
    
    const [foreignKeys] = await connection.execute(`
      SELECT 
        TABLE_NAME,
        COLUMN_NAME,
        CONSTRAINT_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = ? 
        AND REFERENCED_TABLE_NAME IS NOT NULL
        AND COLUMN_NAME = 'area_trabajo_id'
    `, [process.env.DB_NAME]);
    
    foreignKeys.forEach(fk => {
      console.log(`  ✅ ${fk.TABLE_NAME}.${fk.COLUMN_NAME} -> ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });
    
    // 3. Verificar datos existentes
    console.log('\n📊 Verificando datos existentes...');
    
    // Contar áreas de trabajo
    const [areasCount] = await connection.execute('SELECT COUNT(*) as count FROM areas_trabajo');
    console.log(`  📁 Áreas de trabajo: ${areasCount[0].count}`);
    
    // Contar usuarios con área asignada
    const [usersWithArea] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM usuarios 
      WHERE area_trabajo_id IS NOT NULL
    `);
    console.log(`  👥 Usuarios con área asignada: ${usersWithArea[0].count}`);
    
    // Contar proyectos con área asignada
    const [projectsWithArea] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM proyectos 
      WHERE area_trabajo_id IS NOT NULL
    `);
    console.log(`  📋 Proyectos con área asignada: ${projectsWithArea[0].count}`);
    
    // Contar entregables con área asignada
    const [deliverablesWithArea] = await connection.execute(`
      SELECT COUNT(*) as count 
      FROM entregables 
      WHERE area_trabajo_id IS NOT NULL
    `);
    console.log(`  📦 Entregables con área asignada: ${deliverablesWithArea[0].count}`);
    
    // 4. Probar consulta de entregables con información de área
    console.log('\n🔍 Probando consulta de entregables con información de área...');
    
    const [deliverablesSample] = await connection.execute(`
      SELECT 
        e.id,
        e.titulo,
        e.estado,
        e.area_trabajo_id,
        at.codigo as area_trabajo_codigo,
        p.titulo as proyecto_titulo
      FROM entregables e
      LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
      LEFT JOIN proyectos p ON e.proyecto_id = p.id
      LIMIT 5
    `);
    
    if (deliverablesSample.length > 0) {
      console.log('  ✅ Muestra de entregables con área:');
      deliverablesSample.forEach(d => {
        console.log(`    - ${d.titulo} (${d.estado}) - Área: ${d.area_trabajo_codigo || 'Sin área'} - Proyecto: ${d.proyecto_titulo}`);
      });
    } else {
      console.log('  ⚠️  No hay entregables para mostrar');
    }
    
    // 5. Verificar administradores por área
    console.log('\n👨‍💼 Verificando administradores por área...');
    
    const [adminsByArea] = await connection.execute(`
      SELECT 
        at.codigo as area_codigo,
        COUNT(u.id) as admin_count,
        GROUP_CONCAT(CONCAT(u.nombres, ' ', u.apellidos) SEPARATOR ', ') as admins
      FROM areas_trabajo at
      LEFT JOIN usuarios u ON at.id = u.area_trabajo_id 
        AND u.rol_id = (SELECT id FROM roles WHERE nombre = 'Administrador de Área')
      GROUP BY at.id, at.codigo
      ORDER BY at.codigo
    `);
    
    adminsByArea.forEach(area => {
      console.log(`  📁 ${area.area_codigo}: ${area.admin_count} admin(s)`);
      if (area.admins) {
        console.log(`    👥 ${area.admins}`);
      }
    });
    
    console.log('\n✅ Prueba del flujo completo finalizada exitosamente');
    
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
testCompleteFlow()
  .then(() => {
    console.log('\n🎉 Todas las pruebas completadas');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error en las pruebas:', error);
    process.exit(1);
  });