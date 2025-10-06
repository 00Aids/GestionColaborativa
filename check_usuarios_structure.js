const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsuariosStructure() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== ESTRUCTURA DE LA TABLA USUARIOS ===\n');

        const [result] = await connection.execute('DESCRIBE usuarios');
        
        console.log('Columnas disponibles:');
        result.forEach(col => {
            console.log(`  ${col.Field} - ${col.Type} - ${col.Null} - ${col.Key} - ${col.Default}`);
        });

        console.log('\n=== VERIFICANDO USUARIO nuevoestudiante2@test.com ===\n');

        // Buscar el usuario con las columnas correctas
        const [userResult] = await connection.execute(`
            SELECT * FROM usuarios WHERE email = ?
        `, ['nuevoestudiante2@test.com']);

        if (userResult.length === 0) {
            console.log('❌ Usuario no encontrado');
        } else {
            console.log('✅ Usuario encontrado:');
            console.log(userResult[0]);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkUsuariosStructure();