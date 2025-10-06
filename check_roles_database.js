const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkRolesDatabase() {
  let connection;
  
  try {
    console.log('🔍 Verificando roles en la base de datos...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    // 1. Verificar roles existentes
    console.log('📋 Roles en la base de datos:');
    const [roles] = await connection.execute(
      'SELECT id, nombre, descripcion, activo FROM roles ORDER BY id'
    );

    if (roles.length === 0) {
      console.log('   ❌ No hay roles en la base de datos');
      return;
    }

    roles.forEach(role => {
      console.log(`   ${role.id}. ${role.nombre} - ${role.descripcion} (${role.activo ? 'Activo' : 'Inactivo'})`);
    });

    console.log('\n🎯 ANÁLISIS DEL PROBLEMA:');
    
    // 2. Comparar con los valores hardcodeados en el formulario
    console.log('\n📝 Valores hardcodeados en el formulario de registro:');
    console.log('   1. Administrador');
    console.log('   2. Director');
    console.log('   3. Coordinador');
    console.log('   4. Evaluador');
    console.log('   5. Estudiante');

    console.log('\n🔄 Mapeo actual (Formulario → Base de datos):');
    const formMapping = [
      { formId: 1, formName: 'Administrador', dbRole: roles.find(r => r.id === 1) },
      { formId: 2, formName: 'Director', dbRole: roles.find(r => r.id === 2) },
      { formId: 3, formName: 'Coordinador', dbRole: roles.find(r => r.id === 3) },
      { formId: 4, formName: 'Evaluador', dbRole: roles.find(r => r.id === 4) },
      { formId: 5, formName: 'Estudiante', dbRole: roles.find(r => r.id === 5) }
    ];

    formMapping.forEach(mapping => {
      const dbName = mapping.dbRole ? mapping.dbRole.nombre : 'NO ENCONTRADO';
      const isCorrect = mapping.dbRole && 
        ((mapping.formName === 'Director' && mapping.dbRole.nombre === 'director') ||
         (mapping.formName === 'Coordinador' && mapping.dbRole.nombre === 'coordinador') ||
         (mapping.formName === 'Administrador' && mapping.dbRole.nombre === 'admin') ||
         (mapping.formName === 'Evaluador' && mapping.dbRole.nombre === 'evaluador') ||
         (mapping.formName === 'Estudiante' && mapping.dbRole.nombre === 'estudiante'));
      
      const status = isCorrect ? '✅' : '❌';
      console.log(`   ${status} ${mapping.formId}. ${mapping.formName} → ${dbName}`);
    });

    console.log('\n💡 PROBLEMA IDENTIFICADO:');
    const directorRole = roles.find(r => r.nombre === 'director');
    const coordinadorRole = roles.find(r => r.nombre === 'coordinador');
    
    if (directorRole && coordinadorRole) {
      console.log(`   - En la BD: "director" tiene ID ${directorRole.id}`);
      console.log(`   - En la BD: "coordinador" tiene ID ${coordinadorRole.id}`);
      console.log(`   - En el formulario: "Director" envía ID 2`);
      console.log(`   - En el formulario: "Coordinador" envía ID 3`);
      
      if (directorRole.id !== 2 || coordinadorRole.id !== 3) {
        console.log('   ❌ Los IDs no coinciden - esto causa el intercambio de roles');
      } else {
        console.log('   ✅ Los IDs coinciden - el problema debe estar en otro lugar');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkRolesDatabase();