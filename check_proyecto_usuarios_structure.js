const { executeQuery } = require('./src/config/database');

async function checkProyectoUsuariosStructure() {
    try {
        console.log('🔍 VERIFICANDO ESTRUCTURA DE proyecto_usuarios');
        console.log('='.repeat(50));
        
        // 1. Verificar estructura de la tabla
        console.log('\n📋 1. ESTRUCTURA DE LA TABLA:');
        const structure = await executeQuery(`DESCRIBE proyecto_usuarios`);
        
        structure.forEach(column => {
            console.log(`   ${column.Field}: ${column.Type} ${column.Null === 'YES' ? '(NULL)' : '(NOT NULL)'} ${column.Key ? `[${column.Key}]` : ''} ${column.Default ? `Default: ${column.Default}` : ''}`);
        });
        
        // 2. Verificar todos los datos en la tabla
        console.log('\n📊 2. TODOS LOS DATOS EN proyecto_usuarios:');
        const allData = await executeQuery(`
            SELECT pu.*, p.titulo as proyecto_titulo, 
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre, u.email
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            ORDER BY pu.id
        `);
        
        console.log(`   Total registros: ${allData.length}`);
        allData.forEach((row, index) => {
            console.log(`\n   📝 Registro ${index + 1}:`);
            console.log(`      ID: ${row.id}`);
            console.log(`      Proyecto: ${row.proyecto_titulo} (ID: ${row.proyecto_id})`);
            console.log(`      Usuario: ${row.usuario_nombre} (${row.email})`);
            console.log(`      Rol: ${row.rol}`);
            console.log(`      Estado: ${row.estado || 'N/A'}`);
            console.log(`      Activo: ${row.activo !== undefined ? row.activo : 'N/A'}`);
            console.log(`      Fecha asignación: ${row.fecha_asignacion}`);
        });
        
        // 3. Buscar específicamente al coordinador juan florez valderrama
        console.log('\n🎯 3. BUSCANDO COORDINADOR JUAN FLOREZ VALDERRAMA:');
        const coordinatorData = await executeQuery(`
            SELECT pu.*, p.titulo as proyecto_titulo, 
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre, u.email
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
               OR u.email LIKE '%pruebagestion3@gmail.com%'
        `);
        
        console.log(`   Registros encontrados: ${coordinatorData.length}`);
        coordinatorData.forEach((row, index) => {
            console.log(`\n   📝 Asignación ${index + 1}:`);
            console.log(`      ID: ${row.id}`);
            console.log(`      Proyecto: ${row.proyecto_titulo} (ID: ${row.proyecto_id})`);
            console.log(`      Usuario: ${row.usuario_nombre} (${row.email})`);
            console.log(`      Rol: ${row.rol}`);
            console.log(`      Estado: ${row.estado || 'N/A'}`);
            console.log(`      Activo: ${row.activo !== undefined ? row.activo : 'N/A'}`);
            console.log(`      Fecha asignación: ${row.fecha_asignacion}`);
        });
        
        // 4. Verificar si existe tabla project_members (alternativa)
        console.log('\n🔍 4. VERIFICANDO TABLA ALTERNATIVA project_members:');
        try {
            const projectMembersStructure = await executeQuery(`DESCRIBE project_members`);
            console.log('   ✅ Tabla project_members existe:');
            projectMembersStructure.forEach(column => {
                console.log(`      ${column.Field}: ${column.Type}`);
            });
            
            // Verificar datos en project_members
            const membersData = await executeQuery(`
                SELECT pm.*, p.titulo as proyecto_titulo, 
                       CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre, u.email
                FROM project_members pm
                JOIN proyectos p ON pm.proyecto_id = p.id
                JOIN usuarios u ON pm.usuario_id = u.id
                WHERE LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
                   OR u.email LIKE '%pruebagestion3@gmail.com%'
            `);
            
            console.log(`   Registros del coordinador en project_members: ${membersData.length}`);
            membersData.forEach((row, index) => {
                console.log(`\n   📝 Miembro ${index + 1}:`);
                console.log(`      ID: ${row.id}`);
                console.log(`      Proyecto: ${row.proyecto_titulo} (ID: ${row.proyecto_id})`);
                console.log(`      Usuario: ${row.usuario_nombre} (${row.email})`);
                console.log(`      Rol en proyecto: ${row.rol_en_proyecto}`);
                console.log(`      Activo: ${row.activo}`);
                console.log(`      Fecha unión: ${row.fecha_union}`);
            });
            
        } catch (error) {
            console.log('   ❌ Tabla project_members no existe');
        }
        
        console.log('\n✅ VERIFICACIÓN COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

checkProyectoUsuariosStructure();