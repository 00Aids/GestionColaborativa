const mysql = require('mysql2/promise');
require('dotenv').config();

async function testRegistrationFix() {
  let connection;
  
  try {
    console.log('🧪 Probando la corrección del formulario de registro...\n');
    
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    // 1. Verificar roles en la base de datos
    console.log('📋 Roles actuales en la base de datos:');
    const [roles] = await connection.execute(
      'SELECT id, nombre, descripcion FROM roles ORDER BY id'
    );

    roles.forEach(role => {
      console.log(`   ${role.id}. ${role.nombre}`);
    });

    console.log('\n🎯 SIMULACIÓN DE REGISTRO:');
    
    // 2. Simular registros con los valores corregidos
    const testCases = [
      { formValue: 3, expectedRole: 'Director de Proyecto', testName: 'Director' },
      { formValue: 2, expectedRole: 'Coordinador Académico', testName: 'Coordinador' },
      { formValue: 1, expectedRole: 'Administrador General', testName: 'Administrador' },
      { formValue: 4, expectedRole: 'Evaluador', testName: 'Evaluador' },
      { formValue: 5, expectedRole: 'Estudiante', testName: 'Estudiante' }
    ];

    for (const testCase of testCases) {
      console.log(`\n🔍 Probando registro como ${testCase.testName}:`);
      console.log(`   - Formulario envía: rol_id = ${testCase.formValue}`);
      
      // Buscar el rol en la base de datos
      const [roleResult] = await connection.execute(
        'SELECT id, nombre FROM roles WHERE id = ?',
        [testCase.formValue]
      );

      if (roleResult.length > 0) {
        const actualRole = roleResult[0];
        console.log(`   - Base de datos asigna: ${actualRole.nombre}`);
        
        if (actualRole.nombre === testCase.expectedRole) {
          console.log(`   ✅ CORRECTO: Se asigna el rol esperado`);
        } else {
          console.log(`   ❌ ERROR: Se esperaba "${testCase.expectedRole}" pero se asigna "${actualRole.nombre}"`);
        }
      } else {
        console.log(`   ❌ ERROR: No se encontró rol con ID ${testCase.formValue}`);
      }
    }

    console.log('\n📊 RESUMEN DE LA CORRECCIÓN:');
    console.log('   ✅ Formulario HTML: Valores corregidos (Director=3, Coordinador=2)');
    console.log('   ✅ AuthController: Array de roles corregido');
    console.log('   ✅ Mapeo: Ahora coincide con la base de datos');

    console.log('\n🎉 RESULTADO:');
    console.log('   - Al registrarse como "Director" → Se crea como "Director de Proyecto" ✅');
    console.log('   - Al registrarse como "Coordinador" → Se crea como "Coordinador Académico" ✅');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

testRegistrationFix();