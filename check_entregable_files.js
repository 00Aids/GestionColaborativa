const mysql = require('mysql2/promise');
const config = require('./src/config/database');

async function checkEntregableData() {
    const connection = await mysql.createConnection(config);
    
    console.log('🔍 Verificando datos de entregables...\n');
    
    // Buscar entregables con archivos
    const [entregables] = await connection.execute(`
        SELECT id, titulo, archivo_url, archivos_adjuntos 
        FROM entregables 
        WHERE (archivo_url IS NOT NULL AND archivo_url != '') 
           OR (archivos_adjuntos IS NOT NULL AND archivos_adjuntos != '')
        LIMIT 5
    `);
    
    entregables.forEach(e => {
        console.log(`📋 Entregable ID: ${e.id} - ${e.titulo}`);
        console.log(`   📁 archivo_url (originales): ${e.archivo_url || 'NULL'}`);
        console.log(`   📎 archivos_adjuntos (entregados): ${e.archivos_adjuntos || 'NULL'}`);
        console.log('---');
    });
    
    await connection.end();
}

checkEntregableData().catch(console.error);