const mysql = require('mysql2/promise');
require('dotenv').config();

async function correctUserRole() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('🔧 CORRIGIENDO ROL DEL USUARIO ananim@gmail.com');
    
    const userEmail = 'ananim@gmail.com';
    const projectId = 38;
    
    // 1. Verificar estado actual
    console.log('\n📋 ESTADO ACTUAL:');
    const [currentState] = await connection.execute(`
      SELECT 
        u.email,
        r.nombre as rol_sistema,
        pu.rol as rol_proyecto,
        pu.estado,
        pu.fecha_asignacion,
        p.titulo as proyecto_titulo
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.email = ? AND pu.proyecto_id = ?
    `, [userEmail, projectId]);

    if (currentState.length === 0) {
      console.log('❌ No se encontró la asignación del usuario al proyecto');
      return;
    }

    const current = currentState[0];
    console.log('Usuario:', current.email);
    console.log('Rol en sistema:', current.rol_sistema);
    console.log('Rol en proyecto (actual):', current.rol_proyecto);
    console.log('Proyecto:', current.proyecto_titulo);
    console.log('Estado:', current.estado);
    console.log('Fecha asignación:', current.fecha_asignacion);

    // 2. Realizar la corrección
    console.log('\n🔄 APLICANDO CORRECCIÓN...');
    
    const [updateResult] = await connection.execute(`
      UPDATE proyecto_usuarios 
      SET rol = 'coordinador'
      WHERE usuario_id = (SELECT id FROM usuarios WHERE email = ?) 
      AND proyecto_id = ?
    `, [userEmail, projectId]);

    if (updateResult.affectedRows > 0) {
      console.log('✅ Rol corregido exitosamente');
      console.log('Filas afectadas:', updateResult.affectedRows);
    } else {
      console.log('❌ No se pudo actualizar el rol');
      return;
    }

    // 3. Verificar la corrección
    console.log('\n✅ ESTADO DESPUÉS DE LA CORRECCIÓN:');
    const [newState] = await connection.execute(`
      SELECT 
        u.email,
        r.nombre as rol_sistema,
        pu.rol as rol_proyecto,
        pu.estado,
        pu.fecha_asignacion,
        p.titulo as proyecto_titulo
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE u.email = ? AND pu.proyecto_id = ?
    `, [userEmail, projectId]);

    const corrected = newState[0];
    console.log('Usuario:', corrected.email);
    console.log('Rol en sistema:', corrected.rol_sistema);
    console.log('Rol en proyecto (corregido):', corrected.rol_proyecto);
    console.log('Proyecto:', corrected.proyecto_titulo);
    
    // 4. Verificar consistencia
    if (corrected.rol_sistema === 'Coordinador Académico' && corrected.rol_proyecto === 'coordinador') {
      console.log('\n🎉 ¡CORRECCIÓN EXITOSA!');
      console.log('✅ Los roles ahora son consistentes');
    } else {
      console.log('\n⚠️  Aún hay inconsistencias que revisar');
    }

    // 5. Mostrar resumen de otros usuarios en el proyecto
    console.log('\n👥 OTROS USUARIOS EN EL PROYECTO:');
    const [otherUsers] = await connection.execute(`
      SELECT 
        u.email,
        r.nombre as rol_sistema,
        pu.rol as rol_proyecto,
        pu.estado
      FROM usuarios u
      JOIN roles r ON u.rol_id = r.id
      JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      WHERE pu.proyecto_id = ? AND u.email != ?
      ORDER BY pu.fecha_asignacion
    `, [projectId, userEmail]);

    otherUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   Rol sistema: ${user.rol_sistema}`);
      console.log(`   Rol proyecto: ${user.rol_proyecto}`);
      console.log(`   Estado: ${user.estado}`);
      
      // Verificar consistencia de otros usuarios
      const isConsistent = (
        (user.rol_sistema === 'Estudiante' && user.rol_proyecto === 'estudiante') ||
        (user.rol_sistema === 'Coordinador Académico' && user.rol_proyecto === 'coordinador') ||
        (user.rol_sistema === 'Director' && user.rol_proyecto === 'evaluador') ||
        (user.rol_sistema === 'Evaluador' && user.rol_proyecto === 'evaluador')
      );
      
      if (isConsistent) {
        console.log('   ✅ Roles consistentes');
      } else {
        console.log('   ⚠️  Posible inconsistencia detectada');
      }
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await connection.end();
  }
}

correctUserRole();