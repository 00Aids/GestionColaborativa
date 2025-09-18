const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_academica'
};

async function checkAreasStructure() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');

    console.log('\n=== ESTRUCTURA ACTUAL DE AREAS_TRABAJO ===\n');

    // 1. Describir la tabla areas_trabajo
    console.log('1. Estructura de la tabla areas_trabajo:');
    const [structure] = await connection.execute('DESCRIBE areas_trabajo');
    console.table(structure);

    // 2. Ver datos actuales
    console.log('\n2. Datos actuales en areas_trabajo:');
    const [areas] = await connection.execute('SELECT * FROM areas_trabajo');
    console.table(areas);

    // 3. Ver relación con usuarios
    console.log('\n3. Relación usuarios-areas actual:');
    const [userAreas] = await connection.execute(`
      SELECT 
        u.id as usuario_id,
        u.nombres,
        u.apellidos,
        u.email,
        r.nombre as rol,
        uat.area_trabajo_id,
        a.nombre as area_nombre,
        uat.es_admin,
        uat.activo
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id
      LEFT JOIN areas_trabajo a ON uat.area_trabajo_id = a.id
      WHERE r.nombre LIKE '%Administrador%'
      ORDER BY u.id
    `);
    console.table(userAreas);

    // 4. Ver proyectos por área
    console.log('\n4. Proyectos por área:');
    const [projects] = await connection.execute(`
      SELECT 
        p.id,
        p.titulo,
        p.area_trabajo_id,
        a.nombre as area_nombre
      FROM proyectos p
      LEFT JOIN areas_trabajo a ON p.area_trabajo_id = a.id
      ORDER BY p.area_trabajo_id, p.id
    `);
    console.table(projects);

    console.log('\n✅ Revisión completada');

  } catch (error) {
    console.error('❌ Error durante la revisión:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la revisión
checkAreasStructure();