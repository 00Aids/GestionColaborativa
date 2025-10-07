const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTableStructure() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Verificando estructura de tablas...\n');

        // Verificar estructura de la tabla usuarios
        console.log('📋 Estructura de la tabla usuarios:');
        const [userColumns] = await connection.execute('DESCRIBE usuarios');
        userColumns.forEach(col => {
            console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n📋 Estructura de la tabla proyectos:');
        const [projectColumns] = await connection.execute('DESCRIBE proyectos');
        projectColumns.forEach(col => {
            console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        console.log('\n📋 Estructura de la tabla proyecto_miembros:');
        const [memberColumns] = await connection.execute('DESCRIBE proyecto_miembros');
        memberColumns.forEach(col => {
            console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });

        // Buscar el usuario por email
        console.log('\n🔍 Buscando usuario directofinal1@test.com...');
        const [users] = await connection.execute('SELECT * FROM usuarios WHERE email = ?', ['directofinal1@test.com']);
        
        if (users.length > 0) {
            console.log('✅ Usuario encontrado:');
            console.log(users[0]);
        } else {
            console.log('❌ Usuario no encontrado');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkTableStructure().catch(console.error);