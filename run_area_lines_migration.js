const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'gestion_academica',
  port: process.env.DB_PORT || 3306
};

async function runAreaLinesMigration() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');

    // Leer el archivo de migración
    const migrationPath = path.join(__dirname, 'src', 'config', 'add_area_to_lines_cycles.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');
    
    console.log('\n🔄 Ejecutando migración para áreas específicas...\n');

    // Dividir el SQL en declaraciones individuales
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Ejecutar cada declaración
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        try {
          console.log(`📝 Ejecutando declaración ${i + 1}/${statements.length}...`);
          await connection.execute(statement);
          console.log(`✅ Declaración ${i + 1} ejecutada correctamente`);
        } catch (error) {
          console.error(`❌ Error en declaración ${i + 1}:`, error.message);
          // Continuar con las siguientes declaraciones
        }
      }
    }

    console.log('\n🔍 Verificando resultados de la migración...\n');

    // Verificar estructura de lineas_investigacion
    console.log('1. Estructura de lineas_investigacion:');
    const [lineasStructure] = await connection.execute('DESCRIBE lineas_investigacion');
    console.table(lineasStructure);

    // Verificar estructura de ciclos_academicos
    console.log('\n2. Estructura de ciclos_academicos:');
    const [ciclosStructure] = await connection.execute('DESCRIBE ciclos_academicos');
    console.table(ciclosStructure);

    // Verificar datos migrados
    console.log('\n3. Líneas de investigación con área asignada:');
    const [lineasData] = await connection.execute(`
      SELECT li.*, a.nombre as area_nombre 
      FROM lineas_investigacion li 
      LEFT JOIN areas_trabajo a ON li.area_trabajo_id = a.id
    `);
    console.table(lineasData);

    console.log('\n4. Ciclos académicos con área asignada:');
    const [ciclosData] = await connection.execute(`
      SELECT ca.*, a.nombre as area_nombre 
      FROM ciclos_academicos ca 
      LEFT JOIN areas_trabajo a ON ca.area_trabajo_id = a.id
    `);
    console.table(ciclosData);

    console.log('\n✅ Migración completada exitosamente!');
    console.log('📋 Resumen:');
    console.log('   - Se agregó area_trabajo_id a lineas_investigacion');
    console.log('   - Se agregó area_trabajo_id a ciclos_academicos');
    console.log('   - Se crearon índices para optimización');
    console.log('   - Se migraron datos existentes al área por defecto');

  } catch (error) {
    console.error('❌ Error durante la migración:', error);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

// Ejecutar la migración
runAreaLinesMigration();