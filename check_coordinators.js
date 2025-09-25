const { executeQuery } = require('./src/config/database');

async function checkCoordinators() {
    try {
        console.log('🔍 Verificando estructura de la tabla usuarios...\n');
        
        // Primero verificar la estructura de la tabla usuarios
        const tableStructure = await executeQuery(`DESCRIBE usuarios`);
        
        console.log('📋 Estructura de la tabla usuarios:');
        console.log('===================================');
        tableStructure.forEach(column => {
            console.log(`${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''}`);
        });
        
        console.log('\n🔍 Verificando todos los usuarios...\n');
        
        // Consulta para obtener todos los usuarios
        const allUsers = await executeQuery(`
            SELECT u.*, at.codigo as area_codigo
            FROM usuarios u
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            ORDER BY u.id
        `);
        
        console.log('👥 Usuarios con rol de coordinador:');
        console.log('=====================================');
        
        if (allUsers.length === 0) {
            console.log('❌ No se encontraron usuarios en la base de datos');
        } else {
            console.log(`✅ Se encontraron ${allUsers.length} usuario(s):`);
            console.log('===============================================');
            allUsers.forEach(user => {
                console.log(`ID: ${user.id}`);
                console.log(`Nombre: ${user.nombres || 'N/A'} ${user.apellidos || 'N/A'}`);
                console.log(`Email: ${user.email}`);
                // Mostrar todas las columnas para identificar cuál contiene el rol
                Object.keys(user).forEach(key => {
                    if (!['id', 'nombres', 'apellidos', 'email', 'area_codigo'].includes(key)) {
                        console.log(`${key}: ${user[key]}`);
                    }
                });
                console.log(`Área de trabajo: ${user.area_codigo || 'N/A'}`);
                console.log('---');
            });
        }
        
        // Verificar específicamente el usuario coordinador1@test.com
        console.log('\n🔍 Verificando específicamente coordinador1@test.com...');
        const specificUser = await executeQuery(`
            SELECT u.*, at.codigo as area_codigo
            FROM usuarios u
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.email = 'coordinador1@test.com'
        `);
        
        if (specificUser.length === 0) {
            console.log('❌ No se encontró el usuario coordinador1@test.com');
        } else {
            const user = specificUser[0];
            console.log('✅ Usuario coordinador1@test.com encontrado:');
            console.log(`ID: ${user.id}`);
            console.log(`Nombre: ${user.nombres || 'N/A'} ${user.apellidos || 'N/A'}`);
            console.log(`Email: ${user.email}`);
            // Mostrar todas las propiedades para identificar el rol
            Object.keys(user).forEach(key => {
                if (!['id', 'nombres', 'apellidos', 'email', 'area_codigo'].includes(key)) {
                    console.log(`${key}: ${user[key]}`);
                }
            });
            console.log(`Área de trabajo: ${user.area_codigo || 'N/A'}`);
        }
        
    } catch (error) {
        console.error('❌ Error al verificar coordinadores:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        process.exit(0);
    }
}

checkCoordinators();