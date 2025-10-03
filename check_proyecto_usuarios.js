require('dotenv').config();
const mysql = require('mysql2/promise');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'gestion_academica'
};

async function checkProyectoUsuarios() {
  try {
    console.log('🔍 VERIFICANDO TABLA proyecto_usuarios...\n');
    
    const connection = await mysql.createConnection(dbConfig);
    
    // 1. Verificar estructura de la tabla proyecto_usuarios
    console.log('📋 ESTRUCTURA DE LA TABLA proyecto_usuarios:');
    const [structure] = await connection.execute('DESCRIBE proyecto_usuarios');
    structure.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${column.Key ? `(${column.Key})` : ''}`);
    });
    
    // 2. Obtener todos los registros de proyecto_usuarios
    console.log('\n📊 TODOS LOS REGISTROS EN proyecto_usuarios:');
    const [allRecords] = await connection.execute(`
      SELECT 
        pu.*,
        CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre,
        u.email as usuario_email,
        p.titulo as proyecto_titulo
      FROM proyecto_usuarios pu
      LEFT JOIN usuarios u ON pu.usuario_id = u.id
      LEFT JOIN proyectos p ON pu.proyecto_id = p.id
      ORDER BY pu.proyecto_id, pu.usuario_id
    `);
    
    if (allRecords.length === 0) {
      console.log('  ❌ NO HAY REGISTROS EN LA TABLA proyecto_usuarios');
    } else {
      allRecords.forEach(record => {
        console.log(`  📁 Proyecto: ${record.proyecto_titulo} (ID: ${record.proyecto_id})`);
        console.log(`     Usuario: ${record.usuario_nombre} (${record.usuario_email})`);
        console.log(`     Rol: ${record.rol || 'N/A'}`);
        console.log(`     Estado: ${record.estado || 'N/A'}`);
        console.log(`     Fecha asignación: ${record.fecha_asignacion || 'N/A'}`);
        console.log('');
      });
    }
    
    // 3. Verificar específicamente para nuevoestudiante@test.com
    console.log('\n🔍 VERIFICACIÓN ESPECÍFICA PARA nuevoestudiante@test.com:');
    const [specificUser] = await connection.execute(`
      SELECT 
        pu.*,
        p.titulo as proyecto_titulo,
        p.fecha_inicio,
        p.fecha_fin
      FROM proyecto_usuarios pu
      INNER JOIN usuarios u ON pu.usuario_id = u.id
      INNER JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.email = ?
    `, ['nuevoestudiante@test.com']);
    
    if (specificUser.length === 0) {
      console.log('  ❌ nuevoestudiante@test.com NO TIENE REGISTROS EN proyecto_usuarios');
      
      // Verificar si el usuario existe
      const [userExists] = await connection.execute(`
        SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ?
      `, ['nuevoestudiante@test.com']);
      
      if (userExists.length > 0) {
        console.log(`  ✅ El usuario existe: ${userExists[0].nombres} ${userExists[0].apellidos} (ID: ${userExists[0].id})`);
        
        // Verificar si tiene proyectos asignados directamente
        const [directProjects] = await connection.execute(`
          SELECT id, titulo, fecha_inicio, fecha_fin FROM proyectos WHERE estudiante_id = ?
        `, [userExists[0].id]);
        
        if (directProjects.length > 0) {
          console.log('  📁 PROYECTOS ASIGNADOS DIRECTAMENTE:');
          directProjects.forEach(project => {
            console.log(`     - ${project.titulo} (ID: ${project.id})`);
            console.log(`       Fechas: ${project.fecha_inicio} - ${project.fecha_fin}`);
          });
        } else {
          console.log('  ❌ NO TIENE PROYECTOS ASIGNADOS DIRECTAMENTE');
        }
      } else {
        console.log('  ❌ EL USUARIO NO EXISTE EN LA BASE DE DATOS');
      }
    } else {
      console.log('  ✅ REGISTROS ENCONTRADOS:');
      specificUser.forEach(record => {
        console.log(`     - Proyecto: ${record.proyecto_titulo} (ID: ${record.proyecto_id})`);
        console.log(`       Rol: ${record.rol}`);
        console.log(`       Estado: ${record.estado}`);
        console.log(`       Fechas proyecto: ${record.fecha_inicio} - ${record.fecha_fin}`);
      });
    }
    
    // 4. Verificar otros estudiantes que sí ven proyectos
    console.log('\n🔍 VERIFICACIÓN DE OTROS ESTUDIANTES:');
    const [otherStudents] = await connection.execute(`
      SELECT DISTINCT
        u.email,
        CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo,
        COUNT(pu.proyecto_id) as proyectos_en_tabla
      FROM usuarios u
      LEFT JOIN proyecto_usuarios pu ON u.id = pu.usuario_id AND pu.estado = 'activo'
      WHERE u.rol_id = (SELECT id FROM roles WHERE nombre = 'Estudiante')
      GROUP BY u.id, u.email, u.nombres, u.apellidos
      ORDER BY proyectos_en_tabla DESC
    `);
    
    otherStudents.forEach(student => {
      console.log(`  👤 ${student.nombre_completo} (${student.email}): ${student.proyectos_en_tabla} proyectos`);
    });
    
    // 5. Resumen del problema
    console.log('\n📈 RESUMEN DEL ANÁLISIS:');
    console.log(`  - Total registros en proyecto_usuarios: ${allRecords.length}`);
    console.log(`  - Registros para nuevoestudiante@test.com: ${specificUser.length}`);
    
    if (specificUser.length === 0) {
      console.log('\n❌ PROBLEMA IDENTIFICADO:');
      console.log('   El usuario nuevoestudiante@test.com no tiene registros en proyecto_usuarios');
      console.log('   Por eso no puede ver ningún proyecto en el dashboard');
      console.log('   SOLUCIÓN: Agregar el usuario a la tabla proyecto_usuarios con el rol correcto');
    }
    
    await connection.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProyectoUsuarios();