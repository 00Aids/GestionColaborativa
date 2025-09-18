const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'gestion_academica'
};

async function runAreaMigrations() {
  let connection;
  
  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ Conectado a la base de datos');
    
    // 1. Agregar area_trabajo_id a proyectos
    console.log('\n📝 Paso 1: Agregando area_trabajo_id a proyectos...');
    try {
      await connection.execute(`
        ALTER TABLE proyectos 
        ADD COLUMN area_trabajo_id INT NULL COMMENT 'ID del área de trabajo asignada'
      `);
      console.log('✅ Columna area_trabajo_id agregada a proyectos');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna area_trabajo_id ya existe en proyectos');
      } else {
        throw error;
      }
    }
    
    // 2. Agregar area_trabajo_id a entregables
    console.log('\n📝 Paso 2: Agregando area_trabajo_id a entregables...');
    try {
      await connection.execute(`
        ALTER TABLE entregables 
        ADD COLUMN area_trabajo_id INT NULL COMMENT 'ID del área de trabajo (heredado del proyecto)'
      `);
      console.log('✅ Columna area_trabajo_id agregada a entregables');
    } catch (error) {
      if (error.code === 'ER_DUP_FIELDNAME') {
        console.log('ℹ️  Columna area_trabajo_id ya existe en entregables');
      } else {
        throw error;
      }
    }
    
    // 3. Agregar foreign keys
    console.log('\n📝 Paso 3: Agregando foreign keys...');
    
    // Verificar si ya existe la FK en proyectos
    const [existingFKProjects] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'gestion_academica' 
      AND TABLE_NAME = 'proyectos' 
      AND COLUMN_NAME = 'area_trabajo_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (existingFKProjects.length === 0) {
      try {
        await connection.execute(`
          ALTER TABLE proyectos 
          ADD CONSTRAINT fk_proyectos_area_trabajo 
          FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE SET NULL
        `);
        console.log('✅ Foreign key agregada a proyectos');
      } catch (error) {
        console.log('⚠️  Error agregando FK a proyectos:', error.message);
      }
    } else {
      console.log('ℹ️  Foreign key ya existe en proyectos');
    }
    
    // Verificar si ya existe la FK en entregables
    const [existingFKTasks] = await connection.execute(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_SCHEMA = 'gestion_academica' 
      AND TABLE_NAME = 'entregables' 
      AND COLUMN_NAME = 'area_trabajo_id'
      AND REFERENCED_TABLE_NAME IS NOT NULL
    `);
    
    if (existingFKTasks.length === 0) {
      try {
        await connection.execute(`
          ALTER TABLE entregables 
          ADD CONSTRAINT fk_entregables_area_trabajo 
          FOREIGN KEY (area_trabajo_id) REFERENCES areas_trabajo(id) ON DELETE SET NULL
        `);
        console.log('✅ Foreign key agregada a entregables');
      } catch (error) {
        console.log('⚠️  Error agregando FK a entregables:', error.message);
      }
    } else {
      console.log('ℹ️  Foreign key ya existe en entregables');
    }
    
    // 4. Agregar índices
    console.log('\n📝 Paso 4: Agregando índices...');
    try {
      await connection.execute(`
        ALTER TABLE proyectos ADD INDEX idx_proyectos_area_trabajo (area_trabajo_id)
      `);
      console.log('✅ Índice agregado a proyectos');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Índice ya existe en proyectos');
      } else {
        throw error;
      }
    }
    
    try {
      await connection.execute(`
        ALTER TABLE entregables ADD INDEX idx_entregables_area_trabajo (area_trabajo_id)
      `);
      console.log('✅ Índice agregado a entregables');
    } catch (error) {
      if (error.code === 'ER_DUP_KEYNAME') {
        console.log('ℹ️  Índice ya existe en entregables');
      } else {
        throw error;
      }
    }
    
    // 5. Verificar estructura final
    console.log('\n📋 Verificando estructura final...');
    
    const [projectCols] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestion_academica' 
      AND TABLE_NAME = 'proyectos' 
      AND COLUMN_NAME = 'area_trabajo_id'
    `);
    
    const [taskCols] = await connection.execute(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_KEY 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'gestion_academica' 
      AND TABLE_NAME = 'entregables' 
      AND COLUMN_NAME = 'area_trabajo_id'
    `);
    
    console.log('\n=== RESULTADO FINAL ===');
    console.log('Proyectos - area_trabajo_id:', projectCols.length > 0 ? '✅ Existe' : '❌ No existe');
    console.log('Entregables - area_trabajo_id:', taskCols.length > 0 ? '✅ Existe' : '❌ No existe');
    
    console.log('\n🎉 Migraciones de área completadas exitosamente!');
    
  } catch (error) {
    console.error('❌ Error en migraciones:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n🔌 Conexión cerrada');
    }
  }
}

runAreaMigrations();