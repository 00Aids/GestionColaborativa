const mysql = require('mysql2/promise');
require('dotenv').config();

async function createProyectoComentariosTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'gestion_academica'
    });
    
    console.log('Ejecutando migración para crear tabla proyecto_comentarios...');
    
    const migrationSQL = `
CREATE TABLE IF NOT EXISTS proyecto_comentarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    usuario_id INT NOT NULL,
    comentario TEXT NOT NULL,
    tipo ENUM('comentario', 'sistema', 'archivo') DEFAULT 'comentario',
    archivo_adjunto JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
)`;
    
    await connection.execute(migrationSQL);
    console.log('✅ Tabla proyecto_comentarios creada exitosamente');
    
    // Verificar que se creó correctamente
    const [result] = await connection.execute('DESCRIBE proyecto_comentarios');
    console.log('\nEstructura de la tabla:');
    result.forEach(column => {
      console.log(`  - ${column.Field}: ${column.Type}`);
    });
    
    // Verificar que ahora aparece en la lista de tablas
    console.log('\n--- Verificando tablas de comentarios después de la migración ---');
    const [tables] = await connection.execute("SHOW TABLES LIKE '%comentarios%'");
    console.log('Tablas de comentarios encontradas:');
    tables.forEach(table => {
      console.log('- ' + Object.values(table)[0]);
    });
    
    await connection.end();
    console.log('\n🎉 Migración completada exitosamente');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createProyectoComentariosTable();