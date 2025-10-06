const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixDirectorRole() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== VERIFICANDO ESTRUCTURA DE PROYECTO_USUARIOS ===');
        
        const [structure] = await connection.execute('DESCRIBE proyecto_usuarios');
        console.log('Estructura de la tabla proyecto_usuarios:');
        structure.forEach(column => {
            console.log(`- ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

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

        console.log('\n=== CORRIGIENDO ASIGNACIÓN DEL DIRECTOR ===');
        
        // Obtener ID del director
        const [directorData] = await connection.execute(`
            SELECT id FROM usuarios WHERE email = 'nuevodirector1@test.com'
        `);
        const directorId = directorData[0].id;
        
        // Verificar si existe la asignación
        const [existingAssignment] = await connection.execute(`
            SELECT * FROM proyecto_usuarios 
            WHERE proyecto_id = 2 AND usuario_id = ?
        `, [directorId]);
        
        if (existingAssignment.length > 0) {
            // Actualizar el rol existente
            await connection.execute(`
                UPDATE proyecto_usuarios 
                SET rol = 'director' 
                WHERE proyecto_id = 2 AND usuario_id = ?
            `, [directorId]);
            console.log('✅ Rol del director actualizado en proyecto_usuarios');
        } else {
            // Insertar nueva asignación con rol más corto
            await connection.execute(`
                INSERT INTO proyecto_usuarios (proyecto_id, usuario_id, rol, fecha_asignacion)
                VALUES (2, ?, 'director', NOW())
            `, [directorId]);
            console.log('✅ Director asignado al proyecto 2');
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

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

fixDirectorRole();