const { executeQuery } = require('./src/config/database');

async function checkRoles() {
    try {
        console.log('🔍 Verificando tabla de roles...\n');
        
        // Verificar estructura de la tabla roles
        const rolesStructure = await executeQuery(`DESCRIBE roles`);
        
        console.log('📋 Estructura de la tabla roles:');
        console.log('================================');
        rolesStructure.forEach(column => {
            console.log(`${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
        });
        
        // Obtener todos los roles
        console.log('\n🔍 Verificando todos los roles disponibles...\n');
        const allRoles = await executeQuery(`SELECT * FROM roles ORDER BY id`);
        
        if (allRoles.length === 0) {
            console.log('❌ No se encontraron roles en la base de datos');
        } else {
            console.log(`✅ Se encontraron ${allRoles.length} rol(es):`);
            console.log('==========================================');
            allRoles.forEach(role => {
                console.log(`ID: ${role.id}`);
                Object.keys(role).forEach(key => {
                    if (key !== 'id') {
                        console.log(`${key}: ${role[key]}`);
                    }
                });
                console.log('---');
            });
        }
        
        // Verificar distribución de usuarios por rol
        console.log('\n📊 Distribución de usuarios por rol_id:');
        console.log('=======================================');
        const userDistribution = await executeQuery(`
            SELECT rol_id, COUNT(*) as cantidad
            FROM usuarios
            GROUP BY rol_id
            ORDER BY rol_id
        `);
        
        userDistribution.forEach(dist => {
            console.log(`rol_id ${dist.rol_id}: ${dist.cantidad} usuarios`);
        });
        
        // Mapear usuarios con sus roles
        console.log('\n🔍 Usuarios con información de roles:');
        console.log('====================================');
        const usersWithRoles = await executeQuery(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.rol_id, r.nombre as rol_nombre
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            ORDER BY u.rol_id, u.id
        `);
        
        usersWithRoles.forEach(user => {
            console.log(`${user.nombres} ${user.apellidos} (${user.email}) - rol_id: ${user.rol_id} (${user.rol_nombre || 'Sin rol'})`);
        });
        
    } catch (error) {
        console.error('❌ Error al verificar roles:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkRoles();