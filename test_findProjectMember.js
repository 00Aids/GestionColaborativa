const Project = require('./src/models/Project');

async function testFindProjectMember() {
    try {
        console.log('🔍 Probando método findProjectMember corregido...\n');

        const projectModel = new Project();
        
        // Probar con usuario s@test.com (ID: 62) y proyecto 35
        const projectId = 35;
        const userId = 62;
        
        console.log(`📋 Buscando miembro del proyecto ${projectId} para usuario ${userId}...`);
        
        const member = await projectModel.findProjectMember(projectId, userId);
        
        if (member) {
            console.log('✅ Miembro encontrado:');
            console.log(`   ID: ${member.id}`);
            console.log(`   Proyecto ID: ${member.proyecto_id}`);
            console.log(`   Usuario ID: ${member.usuario_id}`);
            console.log(`   Rol en proyecto: ${member.rol_en_proyecto}`);
            console.log(`   Activo: ${member.activo}`);
            console.log(`   Fecha unión: ${member.fecha_union}`);
        } else {
            console.log('❌ No se encontró el miembro del proyecto');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        process.exit(0);
    }
}

testFindProjectMember();