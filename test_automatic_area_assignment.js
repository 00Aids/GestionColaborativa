const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: 'gestion_academica'
};

async function testAutomaticAreaAssignment() {
  let connection;
  
  try {
    console.log('🚀 Iniciando prueba de asignación automática de área de trabajo...\n');
    
    connection = await mysql.createConnection(dbConfig);
    
    // 1. Crear un usuario de prueba temporal
    console.log('👤 PASO 1: Creando usuario de prueba...');
    
    const testUserEmail = `test_auto_area_${Date.now()}@test.com`;
    const testUserCode = `TEST${Date.now()}`;
    const [userResult] = await connection.execute(`
      INSERT INTO usuarios (codigo_usuario, nombres, apellidos, email, password_hash, rol_id, activo, created_at, updated_at)
      VALUES (?, 'Test', 'AutoArea', ?, '$2a$10$dummy.hash', 3, 1, NOW(), NOW())
    `, [testUserCode, testUserEmail]);
    
    const testUserId = userResult.insertId;
    console.log(`   ✅ Usuario creado: ${testUserEmail} (ID: ${testUserId})`);
    
    // 2. Buscar un proyecto existente con area_trabajo_id
    console.log('\n📁 PASO 2: Buscando proyecto con área de trabajo...');
    
    const [projects] = await connection.execute(`
      SELECT id, titulo, area_trabajo_id 
      FROM proyectos 
      WHERE area_trabajo_id IS NOT NULL 
      LIMIT 1
    `);
    
    if (projects.length === 0) {
      throw new Error('No se encontró ningún proyecto con area_trabajo_id');
    }
    
    const testProject = projects[0];
    console.log(`   ✅ Proyecto encontrado: "${testProject.titulo}" (ID: ${testProject.id}, Área: ${testProject.area_trabajo_id})`);
    
    // 3. Verificar que el usuario NO pertenece al área inicialmente
    console.log('\n🔍 PASO 3: Verificando estado inicial del usuario...');
    
    const [initialArea] = await connection.execute(`
      SELECT * FROM usuario_areas_trabajo 
      WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
    `, [testUserId, testProject.area_trabajo_id]);
    
    console.log(`   Usuario pertenece al área inicialmente: ${initialArea.length > 0 ? '✅ Sí' : '❌ No'}`);
    
    // 4. Crear una invitación para el proyecto
    console.log('\n📧 PASO 4: Creando invitación de prueba...');
    
    const invitationCode = `TEST_INV_${Date.now()}`;
    const [invitationResult] = await connection.execute(`
      INSERT INTO invitaciones (codigo_invitacion, proyecto_id, invitado_por, fecha_expiracion, max_usos, usos_actuales)
      VALUES (?, ?, 1, DATE_ADD(NOW(), INTERVAL 7 DAY), 10, 0)
    `, [invitationCode, testProject.id]);
    
    console.log(`   ✅ Invitación creada con código: ${invitationCode}`);
    
    // 5. Simular el proceso de unión usando joinProjectWithCode
    console.log('\n🔗 PASO 5: Simulando unión al proyecto...');
    
    // Importar el modelo Project
    const Project = require('./src/models/Project');
    const projectModel = new Project();
    
    // Ejecutar joinProjectWithCode
    const joinResult = await projectModel.joinProjectWithCode(invitationCode, testUserId);
    
    if (joinResult.success) {
      console.log(`   ✅ Unión exitosa: ${joinResult.message}`);
    } else {
      throw new Error(`Error en unión: ${joinResult.message}`);
    }
    
    // 6. Verificar que el usuario ahora SÍ pertenece al área
    console.log('\n✅ PASO 6: Verificando asignación automática de área...');
    
    const [finalArea] = await connection.execute(`
      SELECT * FROM usuario_areas_trabajo 
      WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
    `, [testUserId, testProject.area_trabajo_id]);
    
    console.log(`   Usuario pertenece al área después: ${finalArea.length > 0 ? '✅ Sí' : '❌ No'}`);
    
    // 7. Verificar que el usuario está en el proyecto
    console.log('\n📋 PASO 7: Verificando membresía del proyecto...');
    
    const [projectMembership] = await connection.execute(`
      SELECT * FROM proyecto_usuarios 
      WHERE usuario_id = ? AND proyecto_id = ? AND estado = 'activo'
    `, [testUserId, testProject.id]);
    
    console.log(`   Usuario es miembro del proyecto: ${projectMembership.length > 0 ? '✅ Sí' : '❌ No'}`);
    
    // 8. Resultado final
    console.log('\n🎉 RESULTADO FINAL:');
    
    const success = finalArea.length > 0 && projectMembership.length > 0;
    
    if (success) {
      console.log('✅ ¡PRUEBA EXITOSA! La asignación automática de área funciona correctamente');
      console.log('   - El usuario se unió al proyecto');
      console.log('   - El usuario fue asignado automáticamente al área de trabajo');
      console.log('   - No debería haber más errores 403 para este usuario');
    } else {
      console.log('❌ PRUEBA FALLIDA: La asignación automática no funcionó correctamente');
      if (finalArea.length === 0) {
        console.log('   - El usuario NO fue asignado al área de trabajo');
      }
      if (projectMembership.length === 0) {
        console.log('   - El usuario NO fue agregado al proyecto');
      }
    }
    
    // 9. Limpiar datos de prueba
    console.log('\n🧹 PASO 8: Limpiando datos de prueba...');
    
    await connection.execute('DELETE FROM usuario_areas_trabajo WHERE usuario_id = ?', [testUserId]);
    await connection.execute('DELETE FROM proyecto_usuarios WHERE usuario_id = ?', [testUserId]);
    await connection.execute('DELETE FROM invitaciones WHERE codigo_invitacion = ?', [invitationCode]);
    await connection.execute('DELETE FROM usuarios WHERE id = ?', [testUserId]);
    
    console.log('   ✅ Datos de prueba eliminados');
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🧪 Ejecutando prueba de asignación automática de área de trabajo...\n');
testAutomaticAreaAssignment();