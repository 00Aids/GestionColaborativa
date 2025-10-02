const mysql = require('mysql2/promise');

async function debugUser12() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
  });

  try {
    console.log('=== PROBLEMA ENCONTRADO ===');
    console.log('❌ Usuario ID 12 NO existe');
    console.log('   Esto explica por qué assignedUserId se queda como null en createQuickTask');
    console.log('   La validación falla y la tarea se crea sin asignación\n');
    
    console.log('=== VERIFICANDO ESTRUCTURA DE proyecto_usuarios ===');
    const [structure] = await connection.execute('DESCRIBE proyecto_usuarios');
    console.log('Columnas de la tabla proyecto_usuarios:');
    structure.forEach(col => {
      console.log(`  - ${col.Field} (${col.Type})`);
    });
    
    console.log('\n=== MIEMBROS DISPONIBLES DEL PROYECTO 35 ===');
    
    // Obtener miembros del proyecto 35 con la estructura correcta
    const [members] = await connection.execute(`
      SELECT 
        u.id,
        u.nombres,
        u.apellidos,
        u.email
      FROM usuarios u
      INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
      WHERE pu.proyecto_id = 35 AND pu.estado = 'activo'
      ORDER BY u.nombres, u.apellidos
    `);
    
    console.log('Usuarios que SÍ existen y pueden ser asignados:');
    members.forEach(member => {
      console.log(`  - ID: ${member.id}, Nombre: ${member.nombres} ${member.apellidos}, Email: ${member.email}`);
    });
    
    console.log('\n=== SOLUCIÓN ===');
    console.log('1. El formulario debe mostrar solo usuarios que existen');
    console.log('2. Verificar por qué se está enviando ID 12 si no existe');
    console.log('3. Mejorar la validación en createQuickTask para dar mejor feedback');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

debugUser12();