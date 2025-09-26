const mysql = require('mysql2/promise');
require('dotenv').config();

async function createProyectoUsuariosTable() {
  let connection;
  
  try {
    // Conectar a la base de datos
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || 'root',
      database: process.env.DB_NAME || 'gestion_academica'
    });

    console.log('🔍 Verificando estructura de la base de datos...\n');

    // 1. Verificar qué tablas existen
    const [tables] = await connection.execute('SHOW TABLES');
    console.log('📋 Tablas existentes:');
    tables.forEach((table, index) => {
      const tableName = Object.values(table)[0];
      console.log(`   ${index + 1}. ${tableName}`);
    });

    // 2. Verificar si la tabla proyecto_usuarios existe
    const [projectUserTable] = await connection.execute(
      "SHOW TABLES LIKE 'proyecto_usuarios'"
    );

    if (projectUserTable.length === 0) {
      console.log('\n❌ La tabla proyecto_usuarios NO existe. Creándola...\n');
      
      // Crear la tabla proyecto_usuarios
      const createTableSQL = `
        CREATE TABLE proyecto_usuarios (
          id INT AUTO_INCREMENT PRIMARY KEY,
          proyecto_id INT NOT NULL,
          usuario_id INT NOT NULL,
          rol ENUM('coordinador', 'estudiante', 'evaluador') NOT NULL DEFAULT 'estudiante',
          fecha_asignacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          estado ENUM('activo', 'inactivo') DEFAULT 'activo',
          FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
          FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
          UNIQUE KEY unique_proyecto_usuario (proyecto_id, usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `;

      await connection.execute(createTableSQL);
      console.log('✅ Tabla proyecto_usuarios creada exitosamente!');

      // Verificar la estructura de la tabla creada
      const [tableStructure] = await connection.execute('DESCRIBE proyecto_usuarios');
      console.log('\n📊 Estructura de la tabla proyecto_usuarios:');
      tableStructure.forEach(column => {
        console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
      });

    } else {
      console.log('\n✅ La tabla proyecto_usuarios ya existe.');
      
      // Mostrar estructura existente
      const [tableStructure] = await connection.execute('DESCRIBE proyecto_usuarios');
      console.log('\n📊 Estructura actual de la tabla proyecto_usuarios:');
      tableStructure.forEach(column => {
        console.log(`   - ${column.Field}: ${column.Type} ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${column.Key ? `(${column.Key})` : ''}`);
      });
    }

    // 3. Verificar que las tablas relacionadas existen
    console.log('\n🔗 Verificando tablas relacionadas:');
    
    const [proyectosTable] = await connection.execute("SHOW TABLES LIKE 'proyectos'");
    const [usuariosTable] = await connection.execute("SHOW TABLES LIKE 'usuarios'");
    
    console.log(`   - Tabla proyectos: ${proyectosTable.length > 0 ? '✅ Existe' : '❌ No existe'}`);
    console.log(`   - Tabla usuarios: ${usuariosTable.length > 0 ? '✅ Existe' : '❌ No existe'}`);

    // 4. Verificar datos de ejemplo
    if (proyectosTable.length > 0) {
      const [proyectos] = await connection.execute('SELECT COUNT(*) as count FROM proyectos');
      console.log(`   - Proyectos en la base de datos: ${proyectos[0].count}`);
    }

    if (usuariosTable.length > 0) {
      const [usuarios] = await connection.execute('SELECT COUNT(*) as count FROM usuarios');
      console.log(`   - Usuarios en la base de datos: ${usuarios[0].count}`);
    }

    console.log('\n🎉 Verificación completada!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

console.log('🚀 Iniciando verificación y creación de tabla proyecto_usuarios...\n');
createProyectoUsuariosTable();