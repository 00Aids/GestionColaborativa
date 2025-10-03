const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'gestion_proyectos'
};

async function testInvitationProcess() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Conectado a la base de datos');
        
        // 1. Verificar el usuario coordinador actual
        console.log('\n📋 1. VERIFICANDO USUARIO COORDINADOR');
        console.log('=' .repeat(50));
        
        const [coordinatorUsers] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
            FROM usuarios u 
            JOIN roles r ON u.rol_id = r.id 
            WHERE LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
               OR u.email LIKE '%pruebagestion3@gmail.com%'
        `);
        
        if (coordinatorUsers.length === 0) {
            console.log('❌ No se encontró el usuario coordinador');
            return;
        }
        
        const coordinator = coordinatorUsers[0];
        console.log(`✅ Coordinador encontrado: ${coordinator.nombres} ${coordinator.apellidos}`);
        console.log(`   📧 Email: ${coordinator.email}`);
        console.log(`   👤 Rol: ${coordinator.rol_nombre}`);
        console.log(`   🆔 ID: ${coordinator.id}`);
        
        // 2. Verificar asignaciones actuales en proyecto_usuarios
        console.log('\n📋 2. VERIFICANDO ASIGNACIONES ACTUALES');
        console.log('=' .repeat(50));
        
        const [currentAssignments] = await connection.execute(`
            SELECT pu.*, p.titulo as proyecto_nombre, p.id as codigo_proyecto,
                   CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
            FROM proyecto_usuarios pu
            JOIN proyectos p ON pu.proyecto_id = p.id
            JOIN usuarios u ON pu.usuario_id = u.id
            WHERE pu.usuario_id = ?
        `, [coordinator.id]);
        
        console.log(`📊 Asignaciones actuales: ${currentAssignments.length}`);
        currentAssignments.forEach(assignment => {
            console.log(`   🎯 Proyecto: ${assignment.proyecto_nombre} (ID: ${assignment.codigo_proyecto})`);
            console.log(`   👤 Rol: ${assignment.rol}`);
            console.log(`   📅 Fecha asignación: ${assignment.fecha_asignacion}`);
            console.log(`   ✅ Activo: ${assignment.activo ? 'Sí' : 'No'}`);
        });
        
        // 3. Verificar invitaciones existentes
        console.log('\n📋 3. VERIFICANDO INVITACIONES EXISTENTES');
        console.log('=' .repeat(50));
        
        const [invitations] = await connection.execute(`
            SELECT pi.*, p.titulo as proyecto_nombre, p.id as codigo_proyecto,
                   CONCAT(u.nombres, ' ', u.apellidos) as invitado_por
            FROM project_invitations pi
            JOIN proyectos p ON pi.project_id = p.id
            LEFT JOIN usuarios u ON pi.invited_by = u.id
            WHERE pi.email = ? OR pi.invited_user_id = ?
            ORDER BY pi.created_at DESC
        `, [coordinator.email, coordinator.id]);
        
        console.log(`📨 Invitaciones encontradas: ${invitations.length}`);
        invitations.forEach(invitation => {
            console.log(`   🎯 Proyecto: ${invitation.proyecto_nombre} (ID: ${invitation.codigo_proyecto})`);
            console.log(`   📧 Email invitado: ${invitation.email}`);
            console.log(`   🔑 Código: ${invitation.invitation_code}`);
            console.log(`   📊 Estado: ${invitation.status}`);
            console.log(`   👤 Rol: ${invitation.role}`);
            console.log(`   📅 Creada: ${invitation.created_at}`);
            console.log(`   ✅ Aceptada: ${invitation.accepted_at || 'No aceptada'}`);
            console.log(`   ---`);
        });
        
        // 4. Simular el proceso de aceptar invitación por código
        console.log('\n📋 4. SIMULANDO PROCESO DE INVITACIÓN POR CÓDIGO');
        console.log('=' .repeat(50));
        
        // Buscar una invitación pendiente o crear una de prueba
        let testInvitation = invitations.find(inv => inv.status === 'pending');
        
        if (!testInvitation) {
            console.log('🔄 No hay invitaciones pendientes, creando una de prueba...');
            
            // Crear invitación de prueba
            const invitationCode = 'TEST' + Math.random().toString(36).substr(2, 6).toUpperCase();
            
            await connection.execute(`
                INSERT INTO project_invitations 
                (project_id, email, invitation_code, role, status, invited_by, created_at)
                VALUES (1, ?, ?, 'coordinador', 'pending', 1, NOW())
            `, [coordinator.email, invitationCode]);
            
            console.log(`✅ Invitación de prueba creada con código: ${invitationCode}`);
            
            // Obtener la invitación recién creada
            const [newInvitation] = await connection.execute(`
                SELECT pi.*, p.titulo as proyecto_nombre, p.id as codigo_proyecto
                FROM project_invitations pi
                JOIN proyectos p ON pi.project_id = p.id
                WHERE pi.invitation_code = ?
            `, [invitationCode]);
            
            testInvitation = newInvitation[0];
        }
        
        if (testInvitation) {
            console.log(`🎯 Probando con invitación: ${testInvitation.invitation_code}`);
            console.log(`   📧 Email: ${testInvitation.email}`);
            console.log(`   🎯 Proyecto: ${testInvitation.proyecto_nombre}`);
            console.log(`   👤 Rol: ${testInvitation.role}`);
            
            // 5. Simular aceptación de invitación
            console.log('\n📋 5. SIMULANDO ACEPTACIÓN DE INVITACIÓN');
            console.log('=' .repeat(50));
            
            // Verificar si ya existe asignación
            const [existingAssignment] = await connection.execute(`
                SELECT * FROM proyecto_usuarios 
                WHERE proyecto_id = ? AND usuario_id = ? AND rol = ?
            `, [testInvitation.project_id, coordinator.id, testInvitation.role]);
            
            if (existingAssignment.length > 0) {
                console.log('⚠️  Ya existe una asignación para este usuario en este proyecto');
                console.log('   🔄 Actualizando estado a activo...');
                
                await connection.execute(`
                    UPDATE proyecto_usuarios 
                    SET activo = 1, fecha_asignacion = NOW()
                    WHERE proyecto_id = ? AND usuario_id = ? AND rol = ?
                `, [testInvitation.project_id, coordinator.id, testInvitation.role]);
            } else {
                console.log('➕ Creando nueva asignación...');
                
                await connection.execute(`
                    INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, activo, fecha_asignacion)
                    VALUES (?, ?, ?, 1, NOW())
                `, [testInvitation.project_id, coordinator.id, testInvitation.role]);
            }
            
            // Marcar invitación como aceptada
            await connection.execute(`
                UPDATE project_invitations 
                SET status = 'accepted', accepted_at = NOW(), invited_user_id = ?
                WHERE id = ?
            `, [coordinator.id, testInvitation.id]);
            
            console.log('✅ Invitación procesada correctamente');
            
            // 6. Verificar resultado final
            console.log('\n📋 6. VERIFICANDO RESULTADO FINAL');
            console.log('=' .repeat(50));
            
            const [finalAssignments] = await connection.execute(`
                SELECT pu.*, p.titulo as proyecto_nombre, p.id as codigo_proyecto,
                       CONCAT(u.nombres, ' ', u.apellidos) as usuario_nombre
                FROM proyecto_usuarios pu
                JOIN proyectos p ON pu.proyecto_id = p.id
                JOIN usuarios u ON pu.usuario_id = u.id
                WHERE pu.usuario_id = ? AND pu.activo = 1
            `, [coordinator.id]);
            
            console.log(`📊 Asignaciones finales activas: ${finalAssignments.length}`);
            finalAssignments.forEach(assignment => {
                console.log(`   🎯 Proyecto: ${assignment.proyecto_nombre} (ID: ${assignment.codigo_proyecto})`);
                console.log(`   👤 Rol: ${assignment.rol}`);
                console.log(`   📅 Fecha asignación: ${assignment.fecha_asignacion}`);
                console.log(`   ✅ Activo: ${assignment.activo ? 'Sí' : 'No'}`);
            });
            
            // 7. Probar consulta del dashboard
            console.log('\n📋 7. PROBANDO CONSULTA DEL DASHBOARD');
            console.log('=' .repeat(50));
            
            const [dashboardProjects] = await connection.execute(`
                SELECT 
                    p.id,
                    p.titulo as nombre,
                    p.descripcion,
                    p.fecha_propuesta as fecha_inicio,
                    p.fecha_finalizacion as fecha_fin,
                    p.estado,
                    CONCAT(estudiante.nombres, ' ', estudiante.apellidos) as estudiante_nombre,
                    CONCAT(director.nombres, ' ', director.apellidos) as director_nombre,
                    COUNT(DISTINCT e.id) as total_entregables
                FROM proyectos p
                INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                LEFT JOIN proyecto_usuarios pu_estudiante ON p.id = pu_estudiante.proyecto_id AND pu_estudiante.rol = 'estudiante'
                LEFT JOIN usuarios estudiante ON pu_estudiante.usuario_id = estudiante.id
                LEFT JOIN proyecto_usuarios pu_director ON p.id = pu_director.proyecto_id AND pu_director.rol = 'director'
                LEFT JOIN usuarios director ON pu_director.usuario_id = director.id
                LEFT JOIN entregables e ON p.id = e.proyecto_id
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador' AND pu.activo = 1
                GROUP BY p.id, p.titulo, p.descripcion, p.fecha_propuesta, p.fecha_finalizacion, p.estado, estudiante_nombre, director_nombre
                ORDER BY p.fecha_propuesta DESC
            `, [coordinator.id]);
            
            console.log(`🎯 Proyectos encontrados en dashboard: ${dashboardProjects.length}`);
            dashboardProjects.forEach(project => {
                console.log(`   📁 ${project.nombre} (ID: ${project.id})`);
                console.log(`   📊 Estado: ${project.estado}`);
                console.log(`   👨‍🎓 Estudiante: ${project.estudiante_nombre || 'No asignado'}`);
                console.log(`   👨‍🏫 Director: ${project.director_nombre || 'No asignado'}`);
                console.log(`   📋 Entregables: ${project.total_entregables}`);
                console.log(`   ---`);
            });
        }
        
        // 8. Diagnóstico final
        console.log('\n📋 8. DIAGNÓSTICO FINAL');
        console.log('=' .repeat(50));
        
        if (dashboardProjects && dashboardProjects.length > 0) {
            console.log('✅ ÉXITO: El proceso de invitación funciona correctamente');
            console.log('✅ Los proyectos se muestran correctamente en el dashboard');
        } else {
            console.log('❌ PROBLEMA: Los proyectos no se muestran en el dashboard');
            console.log('🔍 Posibles causas:');
            console.log('   - Problema en la consulta SQL del dashboard');
            console.log('   - Asignaciones inactivas (activo = 0)');
            console.log('   - Rol incorrecto en proyecto_usuarios');
            console.log('   - Problema en la sesión del usuario');
        }
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la prueba
testInvitationProcess();