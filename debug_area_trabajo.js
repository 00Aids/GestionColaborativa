const { pool } = require('./src/config/database');

async function debugAreaTrabajo() {
    try {
        console.log('🔍 Verificando área de trabajo del usuario y proyecto...\n');

        // Obtener información del usuario s@test.com
        const [userRows] = await pool.execute(`
            SELECT u.id, u.email, u.area_trabajo_id, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = ?
        `, ['s@test.com']);

        if (userRows.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }

        const user = userRows[0];
        console.log('👤 Usuario s@test.com:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Área de trabajo ID: ${user.area_trabajo_id}`);
        console.log(`   Rol: ${user.rol_nombre}\n`);

        // Obtener información del proyecto 35
        const [projectRows] = await pool.execute(`
            SELECT id, titulo, area_trabajo_id, estudiante_id, director_id
            FROM proyectos
            WHERE id = ?
        `, [35]);

        if (projectRows.length === 0) {
            console.log('❌ Proyecto 35 no encontrado');
            return;
        }

        const project = projectRows[0];
        console.log('📁 Proyecto 35:');
        console.log(`   ID: ${project.id}`);
        console.log(`   Título: ${project.titulo}`);
        console.log(`   Área de trabajo ID: ${project.area_trabajo_id}`);
        console.log(`   Estudiante principal ID: ${project.estudiante_id}`);
        console.log(`   Director ID: ${project.director_id}\n`);

        // Verificar si las áreas de trabajo coinciden
        const areasMatch = project.area_trabajo_id === user.area_trabajo_id;
        console.log(`🔗 ¿Áreas de trabajo coinciden? ${areasMatch ? '✅ SÍ' : '❌ NO'}`);
        
        if (!areasMatch) {
            console.log(`   Usuario área: ${user.area_trabajo_id}`);
            console.log(`   Proyecto área: ${project.area_trabajo_id}`);
        }

        // Verificar si es estudiante principal
        const isMainStudent = project.estudiante_id === user.id;
        console.log(`👨‍🎓 ¿Es estudiante principal? ${isMainStudent ? '✅ SÍ' : '❌ NO'}`);

        // Verificar si es miembro del proyecto
        const [memberRows] = await pool.execute(`
            SELECT * FROM project_members 
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [35, user.id]);

        const isProjectMember = memberRows.length > 0;
        console.log(`👥 ¿Es miembro del proyecto? ${isProjectMember ? '✅ SÍ' : '❌ NO'}`);

        if (isProjectMember) {
            console.log(`   Rol en proyecto: ${memberRows[0].rol_en_proyecto}`);
        }

        // Resultado final de acceso
        console.log('\n🎯 RESULTADO FINAL:');
        if (!areasMatch) {
            console.log('❌ ACCESO DENEGADO: Áreas de trabajo no coinciden');
        } else if (user.rol_nombre === 'Estudiante' && (isMainStudent || isProjectMember)) {
            console.log('✅ ACCESO PERMITIDO: Usuario es estudiante con acceso al proyecto');
        } else {
            console.log('❌ ACCESO DENEGADO: Usuario no tiene permisos suficientes');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugAreaTrabajo();