const { pool } = require('./src/config/database');

async function checkInvitationStructure() {
    try {
        console.log('🔍 Verificando estructura de tablas relacionadas con invitaciones...');
        
        // Mostrar todas las tablas
        const [tables] = await pool.execute(`SHOW TABLES`);
        console.log('\n📋 Tablas disponibles:');
        tables.forEach(table => {
            console.log(`   - ${Object.values(table)[0]}`);
        });
        
        // Buscar tablas que contengan "invit" o similares
        const invitationTables = tables.filter(table => {
            const tableName = Object.values(table)[0].toLowerCase();
            return tableName.includes('invit') || tableName.includes('invite');
        });
        
        if (invitationTables.length > 0) {
            console.log('\n📧 Tablas relacionadas con invitaciones:');
            for (const table of invitationTables) {
                const tableName = Object.values(table)[0];
                console.log(`\n   📋 Estructura de ${tableName}:`);
                const [structure] = await pool.execute(`DESCRIBE ${tableName}`);
                structure.forEach(col => {
                    console.log(`      ${col.Field} - ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : ''} ${col.Key ? `(${col.Key})` : ''}`);
                });
            }
        } else {
            console.log('\n❌ No se encontraron tablas de invitaciones');
        }
        
        // Verificar el proyecto específico
        console.log('\n🎯 Verificando proyecto "levante y engordamiento de pollitasss":');
        const [project] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, p.estudiante_id,
                   u.nombres, u.apellidos, u.email
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.titulo LIKE '%levante y engordamiento de pollitasss%'
        `);
        
        if (project.length > 0) {
            const proj = project[0];
            console.log(`   📁 Proyecto: ${proj.titulo} (ID: ${proj.id})`);
            console.log(`   📊 Estado: ${proj.estado}`);
            if (proj.estudiante_id) {
                console.log(`   👤 Estudiante actual: ${proj.nombres} ${proj.apellidos} (${proj.email}) - ID: ${proj.estudiante_id}`);
            } else {
                console.log(`   👤 Sin estudiante asignado`);
            }
        }
        
        // Verificar usuarios en proyecto_usuarios para este proyecto
        if (project.length > 0) {
            const projectId = project[0].id;
            const [projectUsers] = await pool.execute(`
                SELECT pu.usuario_id, pu.rol, pu.estado, pu.fecha_asignacion,
                       u.nombres, u.apellidos, u.email
                FROM proyecto_usuarios pu
                JOIN usuarios u ON pu.usuario_id = u.id
                WHERE pu.proyecto_id = ?
            `, [projectId]);
            
            console.log(`\n👥 Usuarios asignados al proyecto (${projectUsers.length}):`);
            projectUsers.forEach(user => {
                console.log(`   - ${user.nombres} ${user.apellidos} (${user.email})`);
                console.log(`     Rol: ${user.rol} | Estado: ${user.estado} | Fecha: ${user.fecha_asignacion}`);
            });
        }
        
        // Verificar si el usuario vsoyjostin2@gmail.com está en algún proyecto
        console.log('\n🔍 Verificando asignaciones actuales de vsoyjostin2@gmail.com:');
        const [userProjects] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, 'estudiante_principal' as tipo
            FROM proyectos p
            JOIN usuarios u ON p.estudiante_id = u.id
            WHERE u.email = 'vsoyjostin2@gmail.com'
            
            UNION
            
            SELECT p.id, p.titulo, p.estado, pu.rol as tipo
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE u.email = 'vsoyjostin2@gmail.com'
        `);
        
        if (userProjects.length > 0) {
            console.log('   📋 Proyectos asignados:');
            userProjects.forEach(proj => {
                console.log(`   - ${proj.titulo} (ID: ${proj.id}) - ${proj.tipo} - Estado: ${proj.estado}`);
            });
        } else {
            console.log('   ❌ No tiene proyectos asignados actualmente');
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

checkInvitationStructure();