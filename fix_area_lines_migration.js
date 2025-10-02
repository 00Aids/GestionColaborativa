const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración de la base de datos
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root',
  database: process.env.DB_NAME || 'gestion_academica',
  port: process.env.DB_PORT || 3306
};

async function fixAreaLinesMigration() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');

    console.log('\n🔍 Verificando estructura actual...\n');

    // Verificar estructura actual de lineas_investigacion
    console.log('1. Estructura actual de lineas_investigacion:');
    const [lineasStructure] = await connection.execute('DESCRIBE lineas_investigacion');
    console.table(lineasStructure);

    // Verificar estructura actual de ciclos_academicos
    console.log('\n2. Estructura actual de ciclos_academicos:');
    const [ciclosStructure] = await connection.execute('DESCRIBE ciclos_academicos');
    console.table(ciclosStructure);

    // Verificar si ya existe la columna area_trabajo_id en lineas_investigacion
    const hasAreaInLineas = lineasStructure.some(col => col.Field === 'area_trabajo_id');
    const hasAreaInCiclos = ciclosStructure.some(col => col.Field === 'area_trabajo_id');

    console.log(`\n📋 Estado actual:`);
    console.log(`   - lineas_investigacion tiene area_trabajo_id: ${hasAreaInLineas ? '✅' : '❌'}`);
    console.log(`   - ciclos_academicos tiene area_trabajo_id: ${hasAreaInCiclos ? '✅' : '❌'}`);

    // Agregar columna a lineas_investigacion si no existe
    if (!hasAreaInLineas) {
      console.log('\n🔧 Agregando area_trabajo_id a lineas_investigacion...');
      try {
        await connection.execute(`
          ALTER TABLE lineas_investigacion 
          ADD COLUMN area_trabajo_id INT NULL AFTER descripcion
        `);
        console.log('✅ Columna area_trabajo_id agregada a lineas_investigacion');
      } catch (error) {
        console.error('❌ Error agregando columna a lineas_investigacion:', error.message);
      }
    }

    // Agregar columna a ciclos_academicos si no existe
    if (!hasAreaInCiclos) {
      console.log('\n🔧 Agregando area_trabajo_id a ciclos_academicos...');
      try {
        await connection.execute(`
          ALTER TABLE ciclos_academicos 
          ADD COLUMN area_trabajo_id INT NULL AFTER activo
        `);
        console.log('✅ Columna area_trabajo_id agregada a ciclos_academicos');
      } catch (error) {
        console.error('❌ Error agregando columna a ciclos_academicos:', error.message);
      }
    }

    // Agregar foreign keys
    console.log('\n🔗 Agregando foreign keys...');
    try {
      await connection.execute(`
        ALTER TABLE lineas_investigacion 
        ADD FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key agregada a lineas_investigacion');
    } catch (error) {
      console.log('⚠️ Foreign key ya existe o error:', error.message);
    }

    try {
      await connection.execute(`
        ALTER TABLE ciclos_academicos 
        ADD FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE CASCADE
      `);
      console.log('✅ Foreign key agregada a ciclos_academicos');
    } catch (error) {
      console.log('⚠️ Foreign key ya existe o error:', error.message);
    }

    // Migrar datos existentes
    console.log('\n📦 Migrando datos existentes al área por defecto...');
    
    const [updateLineas] = await connection.execute(`
      UPDATE lineas_investigacion SET area_trabajo_id = 1 WHERE area_trabajo_id IS NULL
    `);
    console.log(`✅ ${updateLineas.affectedRows} líneas de investigación actualizadas`);

    const [updateCiclos] = await connection.execute(`
      UPDATE ciclos_academicos SET area_trabajo_id = 1 WHERE area_trabajo_id IS NULL
    `);
    console.log(`✅ ${updateCiclos.affectedRows} ciclos académicos actualizados`);

    // Crear índices
    console.log('\n📊 Creando índices...');
    try {
      await connection.execute(`
        CREATE INDEX idx_lineas_investigacion_area ON lineas_investigacion(area_trabajo_id)
      `);
      console.log('✅ Índice creado para lineas_investigacion');
    } catch (error) {
      console.log('⚠️ Índice ya existe o error:', error.message);
    }

    try {
      await connection.execute(`
        CREATE INDEX idx_ciclos_academicos_area ON ciclos_academicos(area_trabajo_id)
      `);
      console.log('✅ Índice creado para ciclos_academicos');
    } catch (error) {
      console.log('⚠️ Índice ya existe o error:', error.message);
    }

    // Verificar resultados finales
    console.log('\n🔍 Verificando resultados finales...\n');

    console.log('3. Líneas de investigación con área asignada:');
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
fixAreaLinesMigration();