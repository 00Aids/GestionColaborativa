const { pool } = require('./src/config/database');

async function checkProjectInvitationsStructure() {
    try {
        console.log('🔍 Verificando estructura de project_invitations...');
        
        const [structure] = await pool.execute('DESCRIBE project_invitations');
        console.log('\n📋 Estructura de project_invitations:');
        structure.forEach(col => {
            console.log(`   ${col.Field.padEnd(20)} | ${col.Type.padEnd(20)} | ${col.Null.padEnd(5)} | ${col.Key.padEnd(5)} | ${col.Default || 'NULL'}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

checkProjectInvitationsStructure();