const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_academica'
};

async function fixAdminAreas() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');
    
    // Verificar administradores actuales
    console.log('\n=== ADMINISTRADORES ACTUALES ===');
    const [admins] = await connection.execute(`
      SELECT u.id, u.email, r.nombre as rol, 
             uat.area_trabajo_id, at.codigo as area_codigo,
             uat.es_admin
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id AND uat.activo = 1
      LEFT JOIN areas_trabajo at ON uat.area_trabajo_id = at.id 
      WHERE r.nombre LIKE '%Administrador%'
    `);
    
    console.table(admins);
    
    // Encontrar administradores sin área
    const adminsWithoutArea = admins.filter(admin => !admin.area_trabajo_id);
    
    if (adminsWithoutArea.length > 0) {
      console.log('\n⚠️  ADMINISTRADORES SIN ÁREA ASIGNADA:');
      console.table(adminsWithoutArea);
      
      // Asignar diferentes áreas a diferentes administradores
      const areas = await connection.execute('SELECT id, codigo FROM areas_trabajo ORDER BY id');
      const availableAreas = areas[0];
      
      console.log('\n📋 Áreas disponibles:');
      console.table(availableAreas);
      
      // Asignar áreas de manera distribuida
      for (let i = 0; i < adminsWithoutArea.length; i++) {
        const admin = adminsWithoutArea[i];
        const areaIndex = i % availableAreas.length;
        const assignedArea = availableAreas[areaIndex];
        
        // Insertar en la tabla de relación usuario_areas_trabajo
        await connection.execute(`
          INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, activo)
          VALUES (?, ?, 1, 1)
          ON DUPLICATE KEY UPDATE 
          es_admin = 1, activo = 1, updated_at = CURRENT_TIMESTAMP
        `, [admin.id, assignedArea.id]);
        
        console.log(`✅ Asignada área "${assignedArea.codigo}" (ID: ${assignedArea.id}) al administrador ${admin.email}`);
      }
    } else {
      console.log('\n✅ Todos los administradores ya tienen área asignada');
    }
    
    // Mostrar resultado final
    console.log('\n=== ADMINISTRADORES DESPUÉS DE LA CORRECCIÓN ===');
    const [finalAdmins] = await connection.execute(`
      SELECT u.id, u.email, r.nombre as rol, 
             uat.area_trabajo_id, at.codigo as area_codigo,
             uat.es_admin
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id
      LEFT JOIN usuario_areas_trabajo uat ON u.id = uat.usuario_id AND uat.activo = 1
      LEFT JOIN areas_trabajo at ON uat.area_trabajo_id = at.id 
      WHERE r.nombre LIKE '%Administrador%'
      ORDER BY uat.area_trabajo_id
    `);
    
    console.table(finalAdmins);
    
    // Verificar distribución por área
    console.log('\n=== DISTRIBUCIÓN DE USUARIOS POR ÁREA ===');
    const [distribution] = await connection.execute(`
      SELECT 
        at.id as area_id,
        at.codigo as area_codigo,
        COUNT(DISTINCT uat.usuario_id) as total_usuarios,
        SUM(CASE WHEN uat.es_admin = 1 THEN 1 ELSE 0 END) as administradores,
        SUM(CASE WHEN uat.es_admin = 0 OR uat.es_admin IS NULL THEN 1 ELSE 0 END) as otros_usuarios
      FROM areas_trabajo at
      LEFT JOIN usuario_areas_trabajo uat ON at.id = uat.area_trabajo_id AND uat.activo = 1
      GROUP BY at.id, at.codigo
      ORDER BY at.id
    `);
    
    console.table(distribution);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

fixAdminAreas();