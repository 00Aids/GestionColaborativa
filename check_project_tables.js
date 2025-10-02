const { pool } = require('./src/config/database');

async function checkProjectTables() {
  const connection = await pool.getConnection();

  try {
    console.log('Verificando tablas relacionadas con proyectos...\n');
    
    // Mostrar todas las tablas
    console.log('=== TABLAS DISPONIBLES ===');
    const [tables] = await connection.execute('SHOW TABLES');
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`- ${tableName}`);
    });
    
    // Verificar estructura de la tabla proyectos
    console.log('\n=== ESTRUCTURA DE LA TABLA PROYECTOS ===');
    const [projectColumns] = await connection.execute('DESCRIBE proyectos');
    projectColumns.forEach(col => {
      console.log(`- ${col.Field}: ${col.Type} (${col.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // Buscar tablas que puedan contener relaciones usuario-proyecto
    console.log('\n=== BUSCANDO TABLAS DE RELACIONES ===');
    const relationTables = tables.filter(table => {
      const tableName = Object.values(table)[0].toLowerCase();
      return tableName.includes('proyecto') || tableName.includes('member') || tableName.includes('miembro');
    });
    
    for (const table of relationTables) {
      const tableName = Object.values(table)[0];
      console.log(`\nTabla: ${tableName}`);
      try {
        const [columns] = await connection.execute(`DESCRIBE ${tableName}`);
        columns.forEach(col => {
          console.log(`  - ${col.Field}: ${col.Type}`);
        });
      } catch (error) {
        console.log(`  Error al describir tabla: ${error.message}`);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

checkProjectTables();