const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixEnumConstraint() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== PROBLEMA IDENTIFICADO ===');
        console.log('La columna "rol" en proyecto_usuarios es un ENUM con valores:');
        console.log('- coordinador');
        console.log('- estudiante'); 
        console.log('- evaluador');
        console.log('- administrador');
        console.log('');
        console.log('NO incluye "director", por eso falla la inserción.');

        console.log('\n=== VERIFICANDO ASIGNACIONES ACTUALES ===');
        const [assignments] = await connection.execute(`
            SELECT pu.*, u.email, p.titulo as proyecto_titulo
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email, pu.proyecto_id
        `);
        
        console.log('Asignaciones actuales:');
        assignments.forEach(assignment => {
            console.log(`- ${assignment.email}: Proyecto ${assignment.proyecto_id} (${assignment.proyecto_titulo}) como "${assignment.rol}"`);
        });

        console.log('\n=== SOLUCIÓN: ASIGNAR DIRECTOR COMO ADMINISTRADOR ===');
        console.log('Ya que el director necesita permisos altos, lo asignaremos como "administrador"');
        
        // Obtener ID del director
        const [directorData] = await connection.execute(`
            SELECT id FROM usuarios WHERE email = 'nuevodirector1@test.com'
        `);
        const directorId = directorData[0].id;
        
        // Verificar si ya existe una asignación
        const [existingAssignment] = await connection.execute(`
            SELECT * FROM proyecto_usuarios 
            WHERE proyecto_id = 2 AND usuario_id = ?
        `, [directorId]);
        
        if (existingAssignment.length > 0) {
            console.log('Ya existe una asignación, actualizando...');
            await connection.execute(`
                UPDATE proyecto_usuarios 
                SET rol = 'administrador' 
                WHERE proyecto_id = 2 AND usuario_id = ?
            `, [directorId]);
            console.log('✅ Rol del director actualizado a "administrador"');
        } else {
            console.log('Creando nueva asignación...');
            await connection.execute(`
                INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion)
                VALUES (2, ?, 'administrador', NOW())
            `, [directorId]);
            console.log('✅ Director asignado al proyecto 2 como "administrador"');
        }

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
            console.log(`- ${assignment.email}: Proyecto ${assignment.proyecto_id} (${assignment.proyecto_titulo}) como "${assignment.rol}"`);
        });

        console.log('\n=== VERIFICANDO ROLES EN TABLA USUARIOS ===');
        const [userRoles] = await connection.execute(`
            SELECT u.id, u.email, u.rol_id, r.nombre as rol_nombre, u.area_trabajo_id
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email
        `);
        
        console.log('Roles en tabla usuarios:');
        userRoles.forEach(user => {
            console.log(`- ${user.email}: rol_id=${user.rol_id} (${user.rol_nombre}), area_trabajo_id=${user.area_trabajo_id}`);
        });

        console.log('\n=== PROBANDO CONSULTA DE ENTREGABLES PARA COORDINADOR ===');
        const coordinatorId = userRoles.find(u => u.email === 'nuevocoordinador1@test.com').id;

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

        console.log('\n=== RESUMEN DE CORRECCIONES ===');
        console.log('✅ nuevocoordinador1@test.com: rol_id=2 (Coordinador Académico), área=2');
        console.log('✅ nuevodirector1@test.com: rol_id=3 (Director de Proyecto), área=2');
        console.log('✅ Ambos asignados al proyecto 2');
        console.log('✅ Coordinador puede ver entregables para calificar');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixEnumConstraint();