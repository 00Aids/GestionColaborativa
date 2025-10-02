const mysql = require('mysql2/promise');

async function checkUserRole() {
    console.log('🔍 Checking User Role and Permissions...\n');
    
    try {
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        // Verificar todos los roles disponibles
        console.log('📋 Available Roles:');
        const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
        roles.forEach(role => {
            console.log(`   ID: ${role.id}, Name: "${role.nombre}", Description: "${role.descripcion}"`);
        });
        
        console.log('\n👤 Admin User Details:');
        const [users] = await connection.execute(`
            SELECT u.*, r.nombre as rol_nombre, r.descripcion as rol_descripcion 
            FROM usuarios u 
            LEFT JOIN roles r ON u.rol_id = r.id 
            WHERE u.email = 'nuevoadmin@test.com'
        `);
        
        if (users.length > 0) {
            const user = users[0];
            console.log(`   ID: ${user.id}`);
            console.log(`   Name: ${user.nombres} ${user.apellidos}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Role ID: ${user.rol_id}`);
            console.log(`   Role Name: "${user.rol_nombre}"`);
            console.log(`   Role Description: "${user.rol_descripcion}"`);
            
            // Verificar si el rol coincide con lo que requieren las rutas admin
            if (user.rol_nombre === 'Administrador General') {
                console.log('✅ User has correct role for admin routes');
            } else {
                console.log('❌ User does NOT have the required role for admin routes');
                console.log('   Required: "Administrador General"');
                console.log(`   Current: "${user.rol_nombre}"`);
            }
        } else {
            console.log('❌ Admin user not found');
        }
        
        // Verificar si existe el rol "Administrador General"
        console.log('\n🔍 Checking for "Administrador General" role:');
        const [adminRoles] = await connection.execute(
            'SELECT * FROM roles WHERE nombre = ?', 
            ['Administrador General']
        );
        
        if (adminRoles.length > 0) {
            console.log('✅ "Administrador General" role exists');
            console.log(`   ID: ${adminRoles[0].id}`);
            
            // Sugerir actualización del usuario
            if (users.length > 0 && users[0].rol_id !== adminRoles[0].id) {
                console.log('\n💡 SOLUTION: Update user role to "Administrador General"');
                console.log(`   UPDATE usuarios SET rol_id = ${adminRoles[0].id} WHERE email = 'nuevoadmin@test.com';`);
            }
        } else {
            console.log('❌ "Administrador General" role does NOT exist');
            console.log('💡 SOLUTION: Either create the role or update the route middleware');
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('❌ Database Error:', error.message);
    }
}

checkUserRole();