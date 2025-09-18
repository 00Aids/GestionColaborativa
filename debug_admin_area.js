const mysql = require('mysql2/promise');
const User = require('./src/models/User');

async function debugAdminArea() {
  let connection;
  
  try {
    // Crear conexión a la base de datos
    connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'gestion_academica'
    });
    
    console.log('🔌 Conectado a la base de datos');
    
    // 1. Buscar administradores generales
    console.log('\n👥 Buscando administradores generales...');
    const [admins] = await connection.execute(`
      SELECT u.*, r.nombre as rol_nombre 
      FROM usuarios u 
      JOIN roles r ON u.rol_id = r.id 
      WHERE r.nombre = 'Administrador General'
    `);
    
    console.log(`📋 Encontrados ${admins.length} administradores:`);
    admins.forEach(admin => {
      console.log(`   - ${admin.nombres} ${admin.apellidos} (ID: ${admin.id})`);
    });
    
    if (admins.length === 0) {
      console.log('❌ No se encontraron administradores generales');
      return;
    }
    
    // 2. Verificar estructura de tablas
    console.log('\n📋 Verificando estructura de tablas...');
    
    // Verificar estructura de areas_trabajo
    const [areasStructure] = await connection.execute('DESCRIBE areas_trabajo');
    console.log('🏢 Estructura de areas_trabajo:');
    areasStructure.forEach(col => {
      console.log(`   - ${col.Field} (${col.Type})`);
    });
    
    // Verificar estructura de usuario_areas_trabajo
    try {
      const [userAreasStructure] = await connection.execute('DESCRIBE usuario_areas_trabajo');
      console.log('\n👥 Estructura de usuario_areas_trabajo:');
      userAreasStructure.forEach(col => {
        console.log(`   - ${col.Field} (${col.Type})`);
      });
    } catch (error) {
      console.log('\n❌ Tabla usuario_areas_trabajo no existe');
    }
    
    // 3. Verificar áreas asignadas a cada administrador
    for (const admin of admins) {
      console.log(`\n🔍 Verificando áreas para ${admin.nombres} ${admin.apellidos}:`);
      
      // Verificar en la tabla usuario_areas_trabajo (simplificado)
      try {
        const [userAreas] = await connection.execute(`
          SELECT uat.*, at.*
          FROM usuario_areas_trabajo uat
          JOIN areas_trabajo at ON uat.area_trabajo_id = at.id
          WHERE uat.usuario_id = ? AND uat.activo = 1
        `, [admin.id]);
      
        if (userAreas.length > 0) {
          console.log(`   ✅ Áreas asignadas (${userAreas.length}):`);
          userAreas.forEach(area => {
            console.log(`      - Área ID: ${area.area_trabajo_id}`);
          });
          
          // Verificar proyectos en esas áreas
          for (const area of userAreas) {
            const [projects] = await connection.execute(`
              SELECT COUNT(*) as total FROM proyectos WHERE area_trabajo_id = ?
            `, [area.area_trabajo_id]);
            
            console.log(`      📊 Proyectos en área ${area.area_trabajo_id}: ${projects[0].total}`);
          }
        } else {
          console.log('   ❌ No tiene áreas asignadas');
          
          // Verificar si tiene area_trabajo_id directamente en la tabla usuarios
          if (admin.area_trabajo_id) {
            const [directArea] = await connection.execute(`
              SELECT * FROM areas_trabajo WHERE id = ?
            `, [admin.area_trabajo_id]);
            
            if (directArea.length > 0) {
              console.log(`   ⚠️  Tiene área directa: ID ${directArea[0].id}`);
            }
          }
        }
      } catch (error) {
        console.log(`   ❌ Error verificando áreas: ${error.message}`);
      }
    }
    
    // 3. Verificar el método getUserAreas del modelo User
    console.log('\n🧪 Probando método getUserAreas del modelo...');
    const userModel = new User();
    
    for (const admin of admins) {
      try {
        const areas = await userModel.getUserAreas(admin.id);
        console.log(`   ${admin.nombres}: ${areas.length} áreas encontradas por el modelo`);
        areas.forEach(area => {
          console.log(`      - ${area.area_nombre} (ID: ${area.area_trabajo_id})`);
        });
      } catch (error) {
        console.log(`   ❌ Error con getUserAreas para ${admin.nombres}: ${error.message}`);
      }
    }
    
    // 4. Verificar proyectos totales por área
    console.log('\n📊 Estadísticas generales de proyectos por área:');
    const [areaStats] = await connection.execute(`
      SELECT 
        at.codigo,
        COUNT(p.id) as total_proyectos
      FROM areas_trabajo at
      LEFT JOIN proyectos p ON at.id = p.area_trabajo_id
      GROUP BY at.id, at.codigo
      ORDER BY total_proyectos DESC
    `);
    
    areaStats.forEach(stat => {
      console.log(`   📊 Área ${stat.codigo}: ${stat.total_proyectos} proyectos`);
    });
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la verificación
debugAdminArea()
  .then(() => {
    console.log('\n🎉 Verificación completada');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 Error en la verificación:', error);
    process.exit(1);
  });