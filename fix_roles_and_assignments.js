const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixRolesAndAssignments() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== VERIFICANDO ROLES ACTUALES ===');
        
        // Verificar roles actuales
        const [currentRoles] = await connection.execute(`
            SELECT u.id, u.email, u.rol_id, r.nombre as rol_nombre, u.area_trabajo_id
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email
        `);
        
        console.log('Roles actuales:');
        currentRoles.forEach(user => {
            console.log(`- ${user.email}: rol_id=${user.rol_id} (${user.rol_nombre}), area_trabajo_id=${user.area_trabajo_id}`);
        });

        console.log('\n=== VERIFICANDO TABLA DE ROLES ===');
        const [roles] = await connection.execute('SELECT * FROM roles ORDER BY id');
        console.log('Roles disponibles:');
        roles.forEach(role => {
            console.log(`- ID ${role.id}: ${role.nombre}`);
        });

        console.log('\n=== CORRIGIENDO ROLES ===');
        
        // Corregir rol de nuevocoordinador1@test.com a coordinador (rol_id 2)
        await connection.execute(`
            UPDATE usuarios 
            SET rol_id = 2, area_trabajo_id = 2 
            WHERE email = 'nuevocoordinador1@test.com'
        `);
        console.log('✅ nuevocoordinador1@test.com actualizado a coordinador (rol_id 2) y área 2');

        // Corregir rol de nuevodirector1@test.com a director (rol_id 3)  
        await connection.execute(`
            UPDATE usuarios 
            SET rol_id = 3, area_trabajo_id = 2 
            WHERE email = 'nuevodirector1@test.com'
        `);
        console.log('✅ nuevodirector1@test.com actualizado a director (rol_id 3) y área 2');

        console.log('\n=== VERIFICANDO ROLES CORREGIDOS ===');
        const [correctedRoles] = await connection.execute(`
            SELECT u.id, u.email, u.rol_id, r.nombre as rol_nombre, u.area_trabajo_id
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email
        `);
        
        console.log('Roles corregidos:');
        correctedRoles.forEach(user => {
            console.log(`- ${user.email}: rol_id=${user.rol_id} (${user.rol_nombre}), area_trabajo_id=${user.area_trabajo_id}`);
        });

        console.log('\n=== VERIFICANDO ASIGNACIONES EN PROYECTO_USUARIOS ===');
        const [projectAssignments] = await connection.execute(`
            SELECT pu.*, u.email, p.titulo as proyecto_titulo
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email, pu.proyecto_id
        `);
        
        console.log('Asignaciones actuales en proyecto_usuarios:');
        if (projectAssignments.length === 0) {
            console.log('- No hay asignaciones actuales');
        } else {
            projectAssignments.forEach(assignment => {
                console.log(`- ${assignment.email}: Proyecto ${assignment.proyecto_id} (${assignment.proyecto_titulo}) como ${assignment.rol}`);
            });
        }

        console.log('\n=== ASIGNANDO USUARIOS AL PROYECTO 2 ===');
        
        // Obtener IDs de usuarios
        const coordinatorId = correctedRoles.find(u => u.email === 'nuevocoordinador1@test.com').id;
        const directorId = correctedRoles.find(u => u.email === 'nuevodirector1@test.com').id;
        
        // Limpiar asignaciones previas del proyecto 2
        await connection.execute(`
            DELETE FROM proyecto_usuarios 
            WHERE proyecto_id = 2 AND usuario_id IN (?, ?)
        `, [coordinatorId, directorId]);
        
        // Asignar coordinador al proyecto 2
        await connection.execute(`
            INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion)
            VALUES (2, ?, 'coordinador', NOW())
        `, [coordinatorId]);
        console.log('✅ Coordinador asignado al proyecto 2');

        // Asignar director al proyecto 2
        await connection.execute(`
            INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion)
            VALUES (2, ?, 'director', NOW())
        `, [directorId]);
        console.log('✅ Director asignado al proyecto 2');

        console.log('\n=== VERIFICANDO ASIGNACIONES FINALES ===');
        const [finalAssignments] = await connection.execute(`
            SELECT pu.*, u.email, p.titulo as proyecto_titulo
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email, pu.proyecto_id
        `);
        
        console.log('Asignaciones finales:');
        finalAssignments.forEach(assignment => {
            console.log(`- ${assignment.email}: Proyecto ${assignment.proyecto_id} (${assignment.proyecto_titulo}) como ${assignment.rol}`);
        });

        console.log('\n=== PROBANDO CONSULTA DE ENTREGABLES PARA COORDINADOR ===');
        const [deliverables] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                CONCAT(u.nombre, ' ', u.apellido) as estudiante_nombre
            FROM entregables e
            JOIN proyectos p ON e.proyecto_id = p.id
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            JOIN usuarios u ON e.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'rechazado')
            ORDER BY e.fecha_entrega DESC
        `, [coordinatorId]);

        console.log(`Entregables visibles para el coordinador (${deliverables.length} encontrados):`);
        deliverables.forEach(deliverable => {
            console.log(`- ID ${deliverable.id}: "${deliverable.titulo}" - Estado: ${deliverable.estado} - Estudiante: ${deliverable.estudiante_nombre}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixRolesAndAssignments();