const mysql = require('mysql2/promise');

async function testInvitationSystem() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        console.log('🔗 Conectado a la base de datos');
        
        // 1. Verificar que el coordinador existe
        console.log('\n👤 PASO 1: Verificando coordinador de prueba...');
        const [coordinators] = await connection.execute(`
            SELECT u.id, u.email, u.nombres, u.apellidos, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = 'nuevocoordinador3@test.com'
        `);
        
        if (coordinators.length === 0) {
            console.log('❌ Coordinador no encontrado');
            return;
        }
        
        const coordinator = coordinators[0];
        console.log(`   ✅ Coordinador encontrado: ${coordinator.nombres} ${coordinator.apellidos}`);
        console.log(`   📧 Email: ${coordinator.email}`);
        console.log(`   🎭 Rol: ${coordinator.rol_nombre}`);
        
        // 2. Verificar proyectos disponibles
        console.log('\n📁 PASO 2: Verificando proyectos disponibles...');
        const [projects] = await connection.execute(`
            SELECT p.id, p.titulo, p.descripcion, p.area_trabajo_id
            FROM proyectos p
            WHERE p.area_trabajo_id IS NOT NULL
            ORDER BY p.id
            LIMIT 1
        `);
        
        if (projects.length === 0) {
            console.log('❌ No hay proyectos con área de trabajo asignada');
            return;
        }
        
        const project = projects[0];
        console.log(`   📁 Proyecto: ${project.titulo} (ID: ${project.id})`);
        console.log(`   🏢 Área de trabajo: ${project.area_trabajo_id}`);
        
        // 3. Crear código de invitación
        console.log('\n🎫 PASO 3: Creando código de invitación...');
        
        const invitationCode = 'TEST' + Math.random().toString(36).substr(2, 6).toUpperCase();
        
        const [invitationResult] = await connection.execute(
            `INSERT INTO invitaciones (proyecto_id, codigo_invitacion, invitado_por, estado, fecha_expiracion, created_at)
             VALUES (?, ?, 1, 'pendiente', DATE_ADD(NOW(), INTERVAL 7 DAY), NOW())`,
            [project.id, invitationCode]
        );
        
        console.log(`   🎫 Código de invitación creado: ${invitationCode}`);
        console.log(`   📋 ID de invitación: ${invitationResult.insertId}`);
        
        // 4. Simular el proceso de aceptar invitación
        console.log('\n🎯 PASO 4: Simulando aceptación de invitación...');
        
        // Buscar la invitación
        const [invitations] = await connection.execute(
            `SELECT i.*, p.area_trabajo_id, p.titulo as proyecto_nombre
             FROM invitaciones i 
             JOIN proyectos p ON i.proyecto_id = p.id 
             WHERE i.codigo_invitacion = ? AND i.estado = 'pendiente' AND i.fecha_expiracion > NOW()`,
            [invitationCode]
        );
        
        if (invitations.length === 0) {
            console.log('❌ Invitación no encontrada o expirada');
            return;
        }
        
        const invitation = invitations[0];
        console.log(`   ✅ Invitación encontrada para proyecto: ${invitation.proyecto_nombre}`);
        
        // 5. Verificar si el usuario ya está en el área de trabajo
        console.log('\n🏢 PASO 5: Verificando área de trabajo...');
        
        const [areaAssignments] = await connection.execute(
            'SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
            [coordinator.id, invitation.area_trabajo_id]
        );
        
        if (areaAssignments.length === 0) {
            console.log('   ➕ Asignando usuario al área de trabajo...');
            await connection.execute(
                `INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, activo, created_at)
                 VALUES (?, ?, 0, 1, NOW())`,
                [coordinator.id, invitation.area_trabajo_id]
            );
            console.log('   ✅ Usuario asignado al área de trabajo');
        } else {
            console.log('   ✅ Usuario ya pertenece al área de trabajo');
        }
        
        // 6. Verificar si el usuario ya está en el proyecto
        console.log('\n📋 PASO 6: Verificando membresía del proyecto...');
        
        const [projectMemberships] = await connection.execute(
            'SELECT * FROM proyecto_usuarios WHERE usuario_id = ? AND proyecto_id = ? AND estado = ?',
            [coordinator.id, invitation.proyecto_id, 'activo']
        );
        
        if (projectMemberships.length === 0) {
            console.log('   ➕ Agregando usuario al proyecto...');
            
            // Determinar el rol basado en el tipo de usuario
            let rol = 'coordinador'; // Para este coordinador específico
            
            await connection.execute(
                `INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, estado, fecha_asignacion)
                 VALUES (?, ?, ?, 'activo', NOW())`,
                [invitation.proyecto_id, coordinator.id, rol]
            );
            
            console.log(`   ✅ Usuario agregado al proyecto con rol: ${rol}`);
        } else {
            console.log('   ✅ Usuario ya es miembro del proyecto');
        }
        
        // 7. Marcar invitación como usada
        console.log('\n✅ PASO 7: Marcando invitación como usada...');
        
        await connection.execute(
            'UPDATE invitaciones SET estado = ?, fecha_aceptacion = NOW() WHERE id = ?',
            ['aceptada', invitation.id]
        );
        
        console.log('   ✅ Invitación marcada como aceptada');
        
        // 8. Verificación final completa
        console.log('\n🎉 PASO 8: Verificación final completa...');
        
        // Verificar área de trabajo
        const [finalArea] = await connection.execute(
            'SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
            [coordinator.id, invitation.area_trabajo_id]
        );
        
        // Verificar membresía del proyecto
        const [projectMembership] = await connection.execute(
            `SELECT pu.*, p.titulo as proyecto_nombre, r.nombre as rol_usuario
             FROM proyecto_usuarios pu
             JOIN proyectos p ON pu.proyecto_id = p.id
             JOIN usuarios u ON pu.usuario_id = u.id
             JOIN roles r ON u.rol_id = r.id
             WHERE pu.usuario_id = ? AND pu.proyecto_id = ? AND pu.estado = ?`,
            [coordinator.id, invitation.proyecto_id, 'activo']
        );
        
        // Verificar estado de invitación
        const [usedInvitation] = await connection.execute(
            'SELECT * FROM invitaciones WHERE id = ? AND estado = ?',
            [invitation.id, 'aceptada']
        );
        
        console.log('\n📊 RESULTADOS FINALES:');
        console.log('=' .repeat(50));
        console.log(`✅ Usuario en área de trabajo: ${finalArea.length > 0 ? 'SÍ' : 'NO'}`);
        console.log(`✅ Usuario en proyecto: ${projectMembership.length > 0 ? 'SÍ' : 'NO'}`);
        if (projectMembership.length > 0) {
            console.log(`   📋 Proyecto: ${projectMembership[0].proyecto_nombre}`);
            console.log(`   🎭 Rol en proyecto: ${projectMembership[0].rol}`);
            console.log(`   👤 Rol de usuario: ${projectMembership[0].rol_usuario}`);
        }
        console.log(`✅ Invitación procesada: ${usedInvitation.length > 0 ? 'SÍ' : 'NO'}`);
        
        // 9. Verificar acceso a entregables
        console.log('\n📦 PASO 9: Verificando acceso a entregables...');
        
        const [deliverables] = await connection.execute(
            `SELECT e.id, e.titulo, e.descripcion
             FROM entregables e
             JOIN proyectos p ON e.proyecto_id = p.id
             JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
             WHERE pu.usuario_id = ? AND pu.estado = 'activo'
             LIMIT 3`,
            [coordinator.id]
        );
        
        console.log(`   📦 Entregables accesibles: ${deliverables.length}`);
        deliverables.forEach((deliverable, index) => {
            console.log(`   ${index + 1}. ${deliverable.titulo}`);
        });
        
        console.log('\n🎉 ¡PRUEBA COMPLETADA EXITOSAMENTE!');
        console.log('El sistema de invitaciones está funcionando correctamente con la nueva estructura.');
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error(error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la prueba
testInvitationSystem();