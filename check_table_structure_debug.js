const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== VERIFICANDO ESTRUCTURA DE TABLAS ===');
        
        // Verificar estructura de entregables
        console.log('\n📋 Estructura tabla entregables:');
        const [entregablesStructure] = await connection.execute('DESCRIBE entregables');
        console.table(entregablesStructure);
        
        // Verificar estructura de proyectos
        console.log('\n📁 Estructura tabla proyectos:');
        const [proyectosStructure] = await connection.execute('DESCRIBE proyectos');
        console.table(proyectosStructure);
        
        // Verificar estructura de usuarios
        console.log('\n👥 Estructura tabla usuarios:');
        const [usuariosStructure] = await connection.execute('DESCRIBE usuarios');
        console.table(usuariosStructure);
        
        // Verificar datos del entregable ID 1
        console.log('\n=== DATOS DEL ENTREGABLE ID 1 ===');
        const [entregableData] = await connection.execute('SELECT * FROM entregables WHERE id = 1');
        console.log('Entregable:', entregableData[0]);
        
        if (entregableData[0]) {
            // Verificar proyecto asociado
            const [proyectoData] = await connection.execute('SELECT * FROM proyectos WHERE id = ?', [entregableData[0].proyecto_id]);
            console.log('Proyecto asociado:', proyectoData[0]);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

checkTableStructure();