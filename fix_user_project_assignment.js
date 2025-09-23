const { pool } = require('./src/config/database');

async function fixUserProjectAssignment() {
    try {
        console.log('🔧 Corrigiendo asignación del usuario vsoyjostin2@gmail.com...');
        
        // Buscar el usuario
        const [user] = await pool.execute(`
            SELECT id, email, nombres, apellidos 
            FROM usuarios 
            WHERE email = 'vsoyjostin2@gmail.com'
        `);
        
        if (user.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const userId = user[0].id;
        console.log(`👤 Usuario: ${user[0].nombres} ${user[0].apellidos} (ID: ${userId})`);
        
        // Buscar el proyecto "levante y engordamiento de pollitasss"
        const [targetProject] = await pool.execute(`
            SELECT id, titulo, estado, estudiante_id 
            FROM proyectos 
            WHERE titulo LIKE '%levante y engordamiento de pollitasss%'
        `);
        
        if (targetProject.length === 0) {
            console.log('❌ Proyecto "levante y engordamiento de pollitasss" no encontrado');
            return;
        }
        
        const projectId = targetProject[0].id;
        console.log(`📁 Proyecto objetivo: ${targetProject[0].titulo} (ID: ${projectId})`);
        console.log(`   Estado actual: ${targetProject[0].estado}`);
        console.log(`   Estudiante actual: ${targetProject[0].estudiante_id || 'ninguno'}`);
        
        // Verificar si hay invitaciones para este usuario y proyecto
        const [invitations] = await pool.execute(`
            SELECT i.id, i.email, i.proyecto_id, i.estado, p.titulo
            FROM invitations i
            JOIN proyectos p ON i.proyecto_id = p.id
            WHERE i.email = ? AND i.proyecto_id = ?
        `, [user[0].email, projectId]);
        
        console.log(`\n📧 Invitaciones encontradas: ${invitations.length}`);
        invitations.forEach(inv => {
            console.log(`   ID: ${inv.id} - Estado: ${inv.estado} - Proyecto: ${inv.titulo}`);
        });
        
        // Remover asignaciones anteriores del usuario
        console.log('\n🧹 Limpiando asignaciones anteriores...');
        
        // Actualizar proyectos donde este usuario era estudiante principal
        const [previousAssignments] = await pool.execute(`
            SELECT id, titulo FROM proyectos WHERE estudiante_id = ?
        `, [userId]);
        
        if (previousAssignments.length > 0) {
            console.log('📋 Proyectos donde era estudiante principal:');
            previousAssignments.forEach(proj => {
                console.log(`   - ${proj.titulo} (ID: ${proj.id})`);
            });
            
            await pool.execute(`
                UPDATE proyectos 
                SET estudiante_id = NULL, updated_at = NOW()
                WHERE estudiante_id = ?
            `, [userId]);
            
            console.log('✅ Removido como estudiante principal de proyectos anteriores');
        }
        
        // Remover de proyecto_usuarios
        await pool.execute(`
            DELETE FROM proyecto_usuarios 
            WHERE usuario_id = ?
        `, [userId]);
        
        console.log('✅ Removido de tabla proyecto_usuarios');
        
        // Asignar al proyecto correcto
        console.log(`\n🎯 Asignando al proyecto correcto: "${targetProject[0].titulo}"`);
        
        await pool.execute(`
            UPDATE proyectos 
            SET estudiante_id = ?, updated_at = NOW()
            WHERE id = ?
        `, [userId, projectId]);
        
        console.log('✅ Asignado como estudiante principal');
        
        // Agregar a proyecto_usuarios
        await pool.execute(`
            INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion, estado)
            VALUES (?, ?, 'estudiante', NOW(), 'activo')
        `, [projectId, userId]);
        
        console.log('✅ Agregado a tabla proyecto_usuarios');
        
        // Verificar la asignación final
        const [verification] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, p.estudiante_id,
                   u.nombres, u.apellidos, u.email
            FROM proyectos p
            JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.id = ? AND u.id = ?
        `, [projectId, userId]);
        
        if (verification.length > 0) {
            const v = verification[0];
            console.log(`\n🎉 ASIGNACIÓN CORREGIDA EXITOSAMENTE:`);
            console.log(`   Proyecto: ${v.titulo} (ID: ${v.id})`);
            console.log(`   Estudiante: ${v.nombres} ${v.apellidos} (${v.email})`);
            console.log(`   Estado: ${v.estado}`);
        }
        
        // Verificar en proyecto_usuarios también
        const [puVerification] = await pool.execute(`
            SELECT pu.rol, pu.estado, p.titulo
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE pu.usuario_id = ? AND pu.proyecto_id = ?
        `, [userId, projectId]);
        
        if (puVerification.length > 0) {
            console.log(`   Rol en proyecto_usuarios: ${puVerification[0].rol} (${puVerification[0].estado})`);
        }
        
        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixUserProjectAssignment();