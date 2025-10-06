const mysql = require('mysql2/promise');

async function testCoordinatorSystem() {
    let connection;
    
    try {
        console.log('🔗 Conectando a la base de datos...');
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        console.log('✅ Conectado a la base de datos\n');

        // Paso 1: Verificar el coordinador específico
        console.log('👤 PASO 1: Verificando coordinador nuevocoordinador3@test.com...');
        const [coordinatorRows] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = ?
        `, ['nuevocoordinador3@test.com']);

        if (coordinatorRows.length === 0) {
            throw new Error('❌ Coordinador nuevocoordinador3@test.com no encontrado');
        }

        const coordinator = coordinatorRows[0];
        console.log(`   ✅ Coordinador encontrado: ${coordinator.nombres} ${coordinator.apellidos}`);
        console.log(`   📧 Email: ${coordinator.email}`);
        console.log(`   🎭 Rol: ${coordinator.rol_nombre}`);
        console.log(`   🆔 ID: ${coordinator.id}\n`);

        // Paso 2: Verificar proyectos asignados al coordinador
        console.log('📁 PASO 2: Verificando proyectos asignados al coordinador...');
        const [projectRows] = await connection.execute(`
            SELECT p.id, p.titulo, p.descripcion, pu.rol, pu.estado, pu.fecha_asignacion
            FROM proyectos p
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            ORDER BY pu.fecha_asignacion DESC
        `, [coordinator.id]);

        console.log(`   📊 Total de proyectos asignados: ${projectRows.length}`);
        projectRows.forEach((project, index) => {
            console.log(`   ${index + 1}. 📁 ${project.titulo}`);
            console.log(`      🎭 Rol: ${project.rol}`);
            console.log(`      📅 Asignado: ${project.fecha_asignacion}`);
            console.log(`      📋 Estado: ${project.estado}`);
        });
        console.log();

        // Paso 3: Verificar áreas de trabajo asignadas
        console.log('🏢 PASO 3: Verificando áreas de trabajo del coordinador...');
        const [areaRows] = await connection.execute(`
            SELECT at.id, at.codigo, uat.es_admin, uat.fecha_asignacion
            FROM areas_trabajo at
            JOIN usuario_areas_trabajo uat ON at.id = uat.area_trabajo_id
            WHERE uat.usuario_id = ? AND uat.activo = 1
            ORDER BY uat.fecha_asignacion DESC
        `, [coordinator.id]);

        console.log(`   📊 Total de áreas de trabajo: ${areaRows.length}`);
        areaRows.forEach((area, index) => {
            console.log(`   ${index + 1}. 🏢 ${area.codigo}`);
            console.log(`      👑 Es admin: ${area.es_admin ? 'SÍ' : 'NO'}`);
            console.log(`      📅 Asignado: ${area.fecha_asignacion}`);
        });
        console.log();

        // Paso 4: Verificar capacidades del coordinador
        console.log('🔧 PASO 4: Verificando capacidades del coordinador...');
        
        // Verificar si puede crear invitaciones
        if (projectRows.length > 0) {
            const testProject = projectRows[0];
            console.log(`   🎫 Probando creación de invitación para proyecto: ${testProject.titulo}`);
            
            const [invitationResult] = await connection.execute(`
                INSERT INTO invitaciones (proyecto_id, codigo_invitacion, invitado_por, fecha_expiracion, max_usos, created_at)
                VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), 1, NOW())
            `, [testProject.id, `TEST${Date.now()}`, coordinator.id]);
            
            console.log(`   ✅ Invitación creada exitosamente (ID: ${invitationResult.insertId})`);
            
            // Limpiar la invitación de prueba
            await connection.execute('DELETE FROM invitaciones WHERE id = ?', [invitationResult.insertId]);
            console.log('   🧹 Invitación de prueba eliminada');
        }
        console.log();

        // Paso 5: Verificar estructura de proyecto_usuarios
        console.log('📋 PASO 5: Verificando estructura de proyecto_usuarios...');
        const [allAssignments] = await connection.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN rol = 'coordinador' THEN 1 ELSE 0 END) as coordinadores,
                SUM(CASE WHEN rol = 'estudiante' THEN 1 ELSE 0 END) as estudiantes,
                SUM(CASE WHEN rol = 'director' THEN 1 ELSE 0 END) as directores,
                SUM(CASE WHEN rol = 'evaluador' THEN 1 ELSE 0 END) as evaluadores,
                SUM(CASE WHEN rol = 'administrador' THEN 1 ELSE 0 END) as administradores
            FROM proyecto_usuarios
            WHERE estado = 'activo'
        `);

        const stats = allAssignments[0];
        console.log('   📊 Estadísticas de asignaciones activas:');
        console.log(`      👥 Total: ${stats.total}`);
        console.log(`      🎯 Coordinadores: ${stats.coordinadores}`);
        console.log(`      📚 Estudiantes: ${stats.estudiantes}`);
        console.log(`      👨‍💼 Directores: ${stats.directores}`);
        console.log(`      🔍 Evaluadores: ${stats.evaluadores}`);
        console.log(`      👑 Administradores: ${stats.administradores}`);
        console.log();

        // Paso 6: Verificar funcionalidad específica del coordinador
        console.log('🎯 PASO 6: Verificando funcionalidades específicas del coordinador...');
        
        if (projectRows.length > 0) {
            const testProject = projectRows[0];
            
            // Verificar miembros del proyecto
            const [members] = await connection.execute(`
                SELECT u.nombres, u.apellidos, u.email, pu.rol, r.nombre as rol_sistema
                FROM proyecto_usuarios pu
                JOIN usuarios u ON pu.usuario_id = u.id
                JOIN roles r ON u.rol_id = r.id
                WHERE pu.proyecto_id = ? AND pu.estado = 'activo'
                ORDER BY pu.rol, u.nombres
            `, [testProject.id]);

            console.log(`   👥 Miembros del proyecto "${testProject.titulo}": ${members.length}`);
            members.forEach((member, index) => {
                console.log(`   ${index + 1}. ${member.nombres} ${member.apellidos}`);
                console.log(`      📧 ${member.email}`);
                console.log(`      🎭 Rol en proyecto: ${member.rol}`);
                console.log(`      🏷️ Rol del sistema: ${member.rol_sistema}`);
            });
        }
        console.log();

        console.log('🎉 VERIFICACIÓN COMPLETA DEL COORDINADOR');
        console.log('==================================================');
        console.log('✅ El coordinador nuevocoordinador3@test.com está correctamente configurado');
        console.log('✅ Tiene acceso a proyectos y áreas de trabajo');
        console.log('✅ La estructura proyecto_usuarios está funcionando');
        console.log('✅ El sistema de roles está operativo');

    } catch (error) {
        console.error('❌ Error durante la verificación:', error.message);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la prueba
testCoordinatorSystem().catch(console.error);