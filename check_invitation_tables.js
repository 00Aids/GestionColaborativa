const { pool } = require('./src/config/database');

async function checkInvitationTables() {
    try {
        console.log('🔍 Verificando tablas de invitaciones...');
        
        // Verificar todas las tablas
        const [allTables] = await pool.execute('SHOW TABLES');
        console.log('\n📋 Todas las tablas:');
        allTables.forEach(table => {
            const tableName = Object.values(table)[0];
            console.log(`   - ${tableName}`);
        });
        
        // Buscar tablas relacionadas con invitaciones
        const [invitTables] = await pool.execute("SHOW TABLES LIKE '%invit%'");
        console.log('\n📧 Tablas de invitaciones:');
        if (invitTables.length > 0) {
            invitTables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   - ${tableName}`);
            });
        } else {
            console.log('   ❌ No se encontraron tablas de invitaciones');
        }
        
        // Buscar tablas relacionadas con proyectos
        const [projectTables] = await pool.execute("SHOW TABLES LIKE '%project%'");
        console.log('\n📊 Tablas de proyectos:');
        if (projectTables.length > 0) {
            projectTables.forEach(table => {
                const tableName = Object.values(table)[0];
                console.log(`   - ${tableName}`);
            });
        } else {
            console.log('   ❌ No se encontraron tablas de proyectos');
        }
        
        // Verificar tabla proyecto_usuarios
        const [proyectoUsuarios] = await pool.execute("SHOW TABLES LIKE 'proyecto_usuarios'");
        console.log('\n👥 Tabla proyecto_usuarios:');
        if (proyectoUsuarios.length > 0) {
            console.log('   ✅ Existe');
            const [structure] = await pool.execute('DESCRIBE proyecto_usuarios');
            console.log('   📋 Estructura:');
            structure.forEach(col => {
                console.log(`      ${col.Field} - ${col.Type}`);
            });
        } else {
            console.log('   ❌ No existe');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkInvitationTables();