const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkFases() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_proyectos'
  });
  
  try {
    const [fases] = await connection.execute('SELECT id, nombre FROM fases LIMIT 5');
    console.log('Fases disponibles:');
    fases.forEach(f => console.log(`  - ID: ${f.id}, Nombre: ${f.nombre}`));
  } catch (error) {
    console.log('Error o tabla fases no existe:', error.message);
    
    // Verificar si hay alguna tabla relacionada con fases
    const [tables] = await connection.execute('SHOW TABLES LIKE "%fase%"');
    console.log('Tablas relacionadas con fases:');
    tables.forEach(t => console.log(`  - ${Object.values(t)[0]}`));
    
    // Verificar entregables existentes para ver qué fase_id usan
    const [existingDeliverables] = await connection.execute('SELECT DISTINCT fase_id FROM entregables LIMIT 5');
    console.log('Fase IDs en entregables existentes:');
    existingDeliverables.forEach(d => console.log(`  - ${d.fase_id}`));
  }
  
  await connection.end();
}

checkFases().catch(console.error);