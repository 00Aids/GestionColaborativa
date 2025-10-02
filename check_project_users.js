const { pool } = require('./src/config/database');

async function checkProjectUsers() {
  try {
    console.log('🔍 Verificando tabla proyecto_usuarios...');
    
    // Verificar estructura de la tabla
    const [structure] = await pool.execute('DESCRIBE proyecto_usuarios');
    console.log('\n📋 Estructura de proyecto_usuarios:');
    structure.forEach(col => {
      console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    // Verificar datos en la tabla
    const [data] = await pool.execute('SELECT * FROM proyecto_usuarios LIMIT 10');
    console.log(`\n📊 Datos en proyecto_usuarios (${data.length} registros):`);
    data.forEach(row => {
      console.log(`  - Proyecto: ${row.proyecto_id}, Usuario: ${row.usuario_id}, Rol: ${row.rol}, Estado: ${row.estado}`);
    });
    
    // Verificar si hay estudiantes asignados
    const [students] = await pool.execute(`
      SELECT pu.*, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre, p.titulo
      FROM proyecto_usuarios pu
      JOIN usuarios u ON pu.usuario_id = u.id
      JOIN roles r ON u.rol_id = r.id
      JOIN proyectos p ON pu.proyecto_id = p.id
      WHERE r.nombre = 'Estudiante'
      LIMIT 5
    `);
    
    console.log(`\n👥 Estudiantes en proyecto_usuarios (${students.length} registros):`);
    students.forEach(student => {
      console.log(`  - ${student.nombres} ${student.apellidos} (${student.email})`);
      console.log(`    Proyecto: ${student.titulo} (ID: ${student.proyecto_id})`);
      console.log(`    Rol en proyecto: ${student.rol}, Estado: ${student.estado}`);
      console.log('');
    });
    
    // Verificar proyectos donde estudiantes son el estudiante principal
    const [mainStudents] = await pool.execute(`
      SELECT p.id, p.titulo, p.estudiante_id, u.nombres, u.apellidos, u.email
      FROM proyectos p
      JOIN usuarios u ON p.estudiante_id = u.id
      JOIN roles r ON u.rol_id = r.id
      WHERE r.nombre = 'Estudiante'
      LIMIT 5
    `);
    
    console.log(`\n🎓 Estudiantes principales en proyectos (${mainStudents.length} registros):`);
    mainStudents.forEach(student => {
      console.log(`  - ${student.nombres} ${student.apellidos} (${student.email})`);
      console.log(`    Proyecto: ${student.titulo} (ID: ${student.id})`);
      console.log(`    Es estudiante principal (estudiante_id: ${student.estudiante_id})`);
      console.log('');
    });
    
    await pool.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkProjectUsers();