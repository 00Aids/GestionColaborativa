const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkInvitationsTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('📋 Estructura de la tabla invitaciones:');
        const [columns] = await connection.execute('DESCRIBE invitaciones');
        columns.forEach(col => {
            console.log(`   ${col.Field} (${col.Type}) - ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
        });
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await connection.end();
    }
}

checkInvitationsTable().catch(console.error);