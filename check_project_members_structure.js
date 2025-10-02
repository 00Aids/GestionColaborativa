const { pool } = require('./src/config/database');

async function checkProjectMembersStructure() {
  const connection = await pool.getConnection();

  try {
    console.log('Verificando estructura de project_members...\n');
    
    // Verificar estructura de la tabla
    const [structure] = await connection.execute('DESCRIBE project_members');
    
    console.log('Columnas de project_members:');
    structure.forEach(column => {
      console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    connection.release();
  }
}

checkProjectMembersStructure();