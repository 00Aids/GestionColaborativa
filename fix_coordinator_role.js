const { executeQuery } = require('./src/config/database');

async function fixCoordinatorRole() {
    try {
        console.log('🔧 Corrigiendo el rol del usuario coordinador1@test.com...\n');
        
        // Verificar el usuario actual
        console.log('📋 Estado actual del usuario:');
        const currentUser = await executeQuery(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.rol_id, r.nombre as rol_nombre
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'coordinador1@test.com'
        `);
        
        if (currentUser.length === 0) {
            console.log('❌ Usuario coordinador1@test.com no encontrado');
            return;
        }
        
        const user = currentUser[0];
        console.log(`Usuario: ${user.nombres} ${user.apellidos}`);
        console.log(`Email: ${user.email}`);
        console.log(`Rol actual: ${user.rol_id} (${user.rol_nombre})`);
        
        // Verificar que el rol de Coordinador Académico existe
        const coordinatorRole = await executeQuery(`
            SELECT * FROM roles WHERE nombre = 'Coordinador Académico'
        `);
        
        if (coordinatorRole.length === 0) {
            console.log('❌ Rol "Coordinador Académico" no encontrado en la base de datos');
            return;
        }
        
        const targetRole = coordinatorRole[0];
        console.log(`\n🎯 Rol objetivo: ${targetRole.id} (${targetRole.nombre})`);
        
        if (user.rol_id === targetRole.id) {
            console.log('✅ El usuario ya tiene el rol correcto');
            return;
        }
        
        // Actualizar el rol del usuario
        console.log('\n🔄 Actualizando rol del usuario...');
        await executeQuery(`
            UPDATE usuarios 
            SET rol_id = ?, updated_at = NOW()
            WHERE email = 'coordinador1@test.com'
        `, [targetRole.id]);
        
        // Verificar la actualización
        const updatedUser = await executeQuery(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.rol_id, r.nombre as rol_nombre
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'coordinador1@test.com'
        `);
        
        const updated = updatedUser[0];
        console.log('\n✅ Rol actualizado correctamente:');
        console.log(`Usuario: ${updated.nombres} ${updated.apellidos}`);
        console.log(`Email: ${updated.email}`);
        console.log(`Nuevo rol: ${updated.rol_id} (${updated.rol_nombre})`);
        
        console.log('\n🎉 ¡Corrección completada! Ahora el usuario coordinador1@test.com debería acceder al dashboard del coordinador.');
        
    } catch (error) {
        console.error('❌ Error al corregir el rol:', error.message);
        console.error('Stack:', error.stack);
    }
}

fixCoordinatorRole();