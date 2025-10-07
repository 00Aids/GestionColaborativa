const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugProjectMemberMethod() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('=== DEBUG: Método findProjectMember ===\n');

    // 1. Verificar qué tablas existen
    console.log('1. Verificando tablas existentes:');
    const [tables] = await connection.execute("SHOW TABLES");
    const relevantTables = tables.filter(t => {
      const tableName = Object.values(t)[0];
      return tableName.includes('project') || tableName.includes('usuario');
    });
    console.log('Tablas relevantes encontradas:', relevantTables.map(t => Object.values(t)[0]));
    console.log();

    // 2. Verificar estructura de project_members
    console.log('2. Estructura de project_members:');
    try {
      const [structure] = await connection.execute("DESCRIBE project_members");
      console.log('Columnas en project_members:');
      structure.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
      });
    } catch (error) {
      console.log('Error al obtener estructura de project_members:', error.message);
    }
    console.log();

    // 3. Verificar estructura de proyecto_usuarios (si existe)
    console.log('3. Estructura de proyecto_usuarios:');
    try {
      const [structure] = await connection.execute("DESCRIBE proyecto_usuarios");
      console.log('Columnas en proyecto_usuarios:');
      structure.forEach(col => {
        console.log(`  - ${col.Field} (${col.Type}) ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Key ? col.Key : ''}`);
      });
    } catch (error) {
      console.log('Error al obtener estructura de proyecto_usuarios:', error.message);
    }
    console.log();

    // 4. Buscar el director en project_members
    console.log('4. Buscando directofinal1@test.com en project_members:');
    const [directorData] = await connection.execute(
      "SELECT id FROM usuarios WHERE email = ?", 
      ['directofinal1@test.com']
    );
    
    if (directorData.length > 0) {
      const directorId = directorData[0].id;
      console.log(`Director ID: ${directorId}`);
      
      const [memberData] = await connection.execute(
        "SELECT * FROM project_members WHERE usuario_id = ?", 
        [directorId]
      );
      
      console.log('Membresías del director:');
      memberData.forEach(member => {
        console.log(`  - Proyecto ID: ${member.proyecto_id}, Rol: ${member.rol_en_proyecto}, Activo: ${member.activo}`);
      });
    }
    console.log();

    // 5. Probar consulta actual del método
    console.log('5. Probando consulta actual del método findProjectMember:');
    try {
      const [currentMethod] = await connection.execute(
        "SELECT * FROM proyecto_usuarios WHERE proyecto_id = ? AND usuario_id = ? AND estado = 'activo'",
        [4, 33] // proyecto final y directofinal1
      );
      console.log('Resultado con consulta actual:', currentMethod);
    } catch (error) {
      console.log('Error con consulta actual:', error.message);
    }
    console.log();

    // 6. Probar consulta corregida
    console.log('6. Probando consulta corregida:');
    try {
      const [correctedMethod] = await connection.execute(
        "SELECT * FROM project_members WHERE proyecto_id = ? AND usuario_id = ? AND activo = 1",
        [4, 33] // proyecto final y directofinal1
      );
      console.log('Resultado con consulta corregida:', correctedMethod);
    } catch (error) {
      console.log('Error con consulta corregida:', error.message);
    }

  } catch (error) {
    console.error('Error en debug:', error);
  } finally {
    await connection.end();
  }
}

debugProjectMemberMethod().catch(console.error);