const mysql = require('mysql2/promise');

async function checkUsersStructure() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== ESTRUCTURA DE LA TABLA USUARIOS ===');
        const [structure] = await connection.execute('DESCRIBE usuarios');
        console.table(structure);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkUsersStructure();