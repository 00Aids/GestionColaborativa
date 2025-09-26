const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkBiografiaData() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Verificando datos de biografía en la base de datos...\n');
        
        // Buscar el usuario estudiante1@test.com
        const [users] = await connection.execute(
            'SELECT id, email, biografia FROM usuarios WHERE email = ?',
            ['estudiante1@test.com']
        );

        if (users.length === 0) {
            console.log('❌ Usuario estudiante1@test.com no encontrado');
            return;
        }

        const user = users[0];
        console.log('👤 Usuario encontrado:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Biografía: "${user.biografia}"`);
        console.log(`   Longitud biografía: ${user.biografia ? user.biografia.length : 0} caracteres`);
        
        if (user.biografia) {
            console.log('\n✅ El campo biografía contiene datos');
        } else {
            console.log('\n❌ El campo biografía está vacío o es NULL');
        }

    } catch (error) {
        console.error('❌ Error al verificar datos:', error.message);
    } finally {
        await connection.end();
    }
}

checkBiografiaData();