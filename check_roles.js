const mysql = require('mysql2/promise');

async function checkRoles() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'gestion_academica'
    });

    try {
        console.log('=== ROLES DISPONIBLES ===');
        const [roles] = await connection.execute('SELECT * FROM roles');
        console.table(roles);

        console.log('\n=== USUARIOS Y SUS ROLES ===');
        const [users] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre, u.area_trabajo_id
            FROM usuarios u 
            LEFT JOIN roles r ON u.rol_id = r.id
            ORDER BY u.id
        `);
        console.table(users);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

checkRoles();