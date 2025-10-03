const { executeQuery } = require('./src/config/database');

async function fixCoordinatorRole() {
    try {
        console.log('🔧 SOLUCIONANDO PROBLEMA DEL ROL DE COORDINADOR\n');
        
        // 1. Verificar roles existentes
        console.log('📋 1. VERIFICANDO ROLES EXISTENTES:');
        const roles = await executeQuery(`
            SELECT id, nombre, descripcion
            FROM roles
            ORDER BY id
        `);
        
        console.log(`   Roles encontrados: ${roles.length}`);
        roles.forEach(role => {
            console.log(`   - ID: ${role.id}, Nombre: ${role.nombre}, Descripción: ${role.descripcion || 'Sin descripción'}`);
        });

        // 2. Buscar el rol de coordinador
        let coordinatorRole = roles.find(role => 
            role.nombre.toLowerCase().includes('coordinador') || 
            role.nombre === 'Coordinador Académico'
        );
        let coordinatorRoleId;

        if (!coordinatorRole) {
            console.log('\n❌ No existe el rol de coordinador. Creándolo...');
            
            await executeQuery(`
                INSERT INTO roles (nombre, descripcion, activo)
                VALUES ('Coordinador Académico', 'Coordinador de proyectos académicos', TRUE)
            `);
            
            const newRole = await executeQuery(`
                SELECT id FROM roles WHERE nombre = 'Coordinador Académico'
            `);
            coordinatorRoleId = newRole[0].id;
            console.log(`✅ Rol de coordinador creado con ID: ${coordinatorRoleId}`);
        } else {
            coordinatorRoleId = coordinatorRole.id;
            console.log(`✅ Rol de coordinador encontrado: ${coordinatorRole.nombre} (ID: ${coordinatorRoleId})`);
        }

        // 3. Buscar al usuario juan florez valderrama
        console.log('\n👤 2. BUSCANDO USUARIO JUAN FLOREZ VALDERRAMA:');
        const users = await executeQuery(`
            SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, u.email, u.rol_id, r.nombre as rol_actual
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE (u.nombres LIKE '%juan%' OR u.apellidos LIKE '%florez%' OR u.apellidos LIKE '%valderrama%') 
            OR u.email LIKE '%juan%'
        `);
        
        if (users.length === 0) {
            console.log('❌ No se encontró el usuario juan florez valderrama');
            
            // Mostrar todos los usuarios para ayudar a identificar
            console.log('\n📋 USUARIOS EXISTENTES:');
            const allUsers = await executeQuery(`
                SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, u.email, r.nombre as rol_actual
                FROM usuarios u
                LEFT JOIN roles r ON u.rol_id = r.id
                ORDER BY u.id
            `);
            
            allUsers.forEach(user => {
                console.log(`   - ID: ${user.id}, Nombre: ${user.nombre_completo}, Email: ${user.email}, Rol: ${user.rol_actual || 'Sin rol'}`);
            });
            
            return;
        }

        console.log(`   Usuarios encontrados: ${users.length}`);
        users.forEach(user => {
            console.log(`   - ID: ${user.id}, Nombre: ${user.nombre_completo}, Email: ${user.email}, Rol actual: ${user.rol_actual || 'Sin rol'}`);
        });

        // 4. Asignar rol de coordinador al primer usuario encontrado
        const targetUser = users[0];
        console.log(`\n🔧 3. ASIGNANDO ROL DE COORDINADOR A: ${targetUser.nombre_completo}`);
        
        if (targetUser.rol_id === coordinatorRoleId) {
            console.log('✅ El usuario ya tiene el rol de coordinador');
        } else {
            await executeQuery(`
                UPDATE usuarios 
                SET rol_id = ?, updated_at = NOW()
                WHERE id = ?
            `, [coordinatorRoleId, targetUser.id]);
            
            console.log(`✅ Rol de coordinador asignado exitosamente al usuario ${targetUser.nombre_completo}`);
        }
        
        // 5. Verificar el cambio
        console.log('\n✅ 4. VERIFICANDO CAMBIOS:');
        const updatedUser = await executeQuery(`
            SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, u.email, u.rol_id, r.nombre as rol_actual
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.id = ?
        `, [targetUser.id]);
        
        if (updatedUser.length > 0) {
            const user = updatedUser[0];
            console.log(`   Usuario: ${user.nombre_completo}`);
            console.log(`   Email: ${user.email}`);
            console.log(`   Rol actual: ${user.rol_actual}`);
            console.log(`   ID del rol: ${user.rol_id}`);
        }

        // 6. Crear un proyecto de prueba si no existe ninguno
        console.log('\n📁 5. VERIFICANDO PROYECTOS EXISTENTES:');
        const projects = await executeQuery(`
            SELECT COUNT(*) as total FROM proyectos
        `);
        
        if (projects[0].total === 0) {
            console.log('❌ No hay proyectos en el sistema. Creando proyecto de prueba...');
            
            // Buscar un estudiante para asignar al proyecto
            const students = await executeQuery(`
                SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo
                FROM usuarios u
                INNER JOIN roles r ON u.rol_id = r.id
                WHERE r.nombre = 'estudiante'
                LIMIT 1
            `);
            
            let studentId = null;
            if (students.length > 0) {
                studentId = students[0].id;
                console.log(`   Estudiante encontrado: ${students[0].nombre_completo} (ID: ${studentId})`);
            } else {
                console.log('   No se encontraron estudiantes, usando el coordinador como estudiante temporalmente');
                studentId = targetUser.id;
            }

            // Buscar ciclo académico
            const cycles = await executeQuery(`
                SELECT id FROM ciclos_academicos WHERE activo = TRUE LIMIT 1
            `);
            
            let cycleId = 1; // Default
            if (cycles.length > 0) {
                cycleId = cycles[0].id;
            }

            // Crear proyecto de prueba
            const projectResult = await executeQuery(`
                INSERT INTO proyectos (
                    titulo, 
                    descripcion, 
                    estudiante_id, 
                    coordinador_id,
                    ciclo_academico_id,
                    estado
                ) VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'Proyecto de Prueba - Dashboard Coordinador',
                'Proyecto creado automáticamente para probar el dashboard de coordinación',
                studentId,
                targetUser.id,
                cycleId,
                'en_desarrollo'
            ]);
            
            const newProjectId = projectResult.insertId;
            console.log(`✅ Proyecto de prueba creado con ID: ${newProjectId}`);
            
            // Agregar el coordinador a la tabla proyecto_usuarios
            await executeQuery(`
                INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, estado)
                VALUES (?, ?, 'coordinador', 'activo')
                ON DUPLICATE KEY UPDATE rol = 'coordinador', estado = 'activo'
            `, [newProjectId, targetUser.id]);
            
            console.log('✅ Coordinador agregado a la tabla proyecto_usuarios');
            
        } else {
            console.log(`✅ Existen ${projects[0].total} proyectos en el sistema`);
            
            // Verificar si el coordinador está asignado a algún proyecto
            const coordinatorProjects = await executeQuery(`
                SELECT COUNT(*) as total 
                FROM proyecto_usuarios 
                WHERE usuario_id = ? AND rol = 'coordinador'
            `, [targetUser.id]);
            
            if (coordinatorProjects[0].total === 0) {
                console.log('❌ El coordinador no está asignado a ningún proyecto');
                
                // Buscar un proyecto existente para asignar
                const existingProjects = await executeQuery(`
                    SELECT id, titulo FROM proyectos WHERE estado != 'finalizado' LIMIT 1
                `);
                
                if (existingProjects.length > 0) {
                    const projectId = existingProjects[0].id;
                    console.log(`   Asignando coordinador al proyecto: ${existingProjects[0].titulo}`);
                    
                    await executeQuery(`
                        INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, estado)
                        VALUES (?, ?, 'coordinador', 'activo')
                        ON DUPLICATE KEY UPDATE rol = 'coordinador', estado = 'activo'
                    `, [projectId, targetUser.id]);
                    
                    console.log('✅ Coordinador asignado al proyecto existente');
                }
            } else {
                console.log(`✅ El coordinador está asignado a ${coordinatorProjects[0].total} proyecto(s)`);
            }
        }

        console.log('\n🎉 PROCESO COMPLETADO EXITOSAMENTE');
        console.log('   El usuario ahora debería poder ver sus proyectos en el dashboard de coordinación');

    } catch (error) {
        console.error('❌ Error durante la corrección:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

fixCoordinatorRole();