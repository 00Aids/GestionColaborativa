const { pool } = require('./src/config/database');

async function assignUserToProject() {
    try {
        console.log('🔍 Asignando usuario vsoyjostin2@gmail.com a un proyecto...');
        
        // Buscar el usuario
        const [user] = await pool.execute(`
            SELECT id, email, nombres, apellidos, rol_id 
            FROM usuarios 
            WHERE email = 'vsoyjostin2@gmail.com'
        `);
        
        if (user.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const userId = user[0].id;
        console.log(`👤 Usuario encontrado: ${user[0].nombres} ${user[0].apellidos} (ID: ${userId})`);
        
        // Buscar un proyecto disponible
        const [projects] = await pool.execute(`
            SELECT id, titulo, estado, estudiante_id 
            FROM proyectos 
            WHERE estado IN ('en_desarrollo', 'borrador')
            LIMIT 3
        `);
        
        console.log('\n📁 Proyectos disponibles:');
        projects.forEach(project => {
            console.log(`  ID: ${project.id} - ${project.titulo} (${project.estado}) - Estudiante actual: ${project.estudiante_id || 'ninguno'}`);
        });
        
        if (projects.length === 0) {
            console.log('❌ No hay proyectos disponibles');
            return;
        }
        
        // Seleccionar el primer proyecto
        const selectedProject = projects[0];
        console.log(`\n🎯 Asignando usuario ${userId} al proyecto ${selectedProject.id}: "${selectedProject.titulo}"`);
        
        // Actualizar el proyecto para asignar el estudiante
        await pool.execute(`
            UPDATE proyectos 
            SET estudiante_id = ?, updated_at = NOW()
            WHERE id = ?
        `, [userId, selectedProject.id]);
        
        console.log('✅ Usuario asignado como estudiante principal del proyecto');
        
        // También agregar en la tabla proyecto_usuarios si no existe
        const [existingAssignment] = await pool.execute(`
            SELECT id FROM proyecto_usuarios 
            WHERE proyecto_id = ? AND usuario_id = ?
        `, [selectedProject.id, userId]);
        
        if (existingAssignment.length === 0) {
            await pool.execute(`
                INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
                VALUES (?, ?, 'estudiante', NOW(), 'activo')
            `, [selectedProject.id, userId]);
            
            console.log('✅ Usuario también agregado a la tabla proyecto_usuarios');
        } else {
            console.log('ℹ️ Usuario ya existe en proyecto_usuarios');
        }
        
        // Verificar la asignación
        const [verification] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, p.estudiante_id,
                   u.nombres, u.apellidos, u.email
            FROM proyectos p
            JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.id = ? AND u.id = ?
        `, [selectedProject.id, userId]);
        
        if (verification.length > 0) {
            const v = verification[0];
            console.log(`\n🎉 ASIGNACIÓN CONFIRMADA:`);
            console.log(`   Proyecto: ${v.titulo} (ID: ${v.id})`);
            console.log(`   Estudiante: ${v.nombres} ${v.apellidos} (${v.email})`);
            console.log(`   Estado: ${v.estado}`);
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

assignUserToProject();