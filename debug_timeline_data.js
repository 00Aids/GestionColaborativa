const mysql = require('mysql2/promise');

async function debugTimelineData() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'gestion_academica'
    });

    try {
        console.log('=== DATOS DEL PROYECTO 4 ===');
        
        // 1. Información del proyecto
        const [project] = await connection.execute(`
            SELECT p.*, u.nombres as director_nombres, u.apellidos as director_apellidos
            FROM proyectos p
            LEFT JOIN usuarios u ON p.director_id = u.id
            WHERE p.id = 4
        `);
        console.log('\n1. PROYECTO:');
        console.log(project[0]);

        // 2. Miembros del proyecto
        const [members] = await connection.execute(`
            SELECT 
                pu.*,
                u.nombres,
                u.apellidos,
                u.email,
                r.nombre as rol
            FROM proyecto_usuarios pu
            LEFT JOIN usuarios u ON pu.usuario_id = u.id
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE pu.proyecto_id = 4 AND pu.estado = 'activo'
            ORDER BY pu.fecha_asignacion ASC
        `);
        console.log('\n2. MIEMBROS:');
        console.log(members);

        // 3. Tareas del proyecto (usando entregables)
        const [tasks] = await connection.execute(`
            SELECT 
                e.*,
                u.nombres as asignado_nombres,
                u.apellidos as asignado_apellidos
            FROM entregables e
            LEFT JOIN usuarios u ON e.asignado_a = u.id
            WHERE e.proyecto_id = 4
            ORDER BY e.created_at ASC
        `);
        console.log('\n3. TAREAS:');
        console.log(tasks);

        // 4. Entregables del proyecto
        const [deliverables] = await connection.execute(`
            SELECT *
            FROM entregables
            WHERE proyecto_id = 4
            ORDER BY created_at ASC
        `);
        console.log('\n4. ENTREGABLES:');
        console.log(deliverables);

        // 5. Invitaciones del proyecto
        const [invitations] = await connection.execute(`
            SELECT *
            FROM invitaciones
            WHERE proyecto_id = 4
            ORDER BY created_at ASC
        `);
        console.log('\n5. INVITACIONES:');
        console.log(invitations);

        // 6. Verificar si existen datos
        console.log('\n=== RESUMEN ===');
        console.log(`Proyecto encontrado: ${project.length > 0 ? 'SÍ' : 'NO'}`);
        console.log(`Miembros: ${members.length}`);
        console.log(`Tareas: ${tasks.length}`);
        console.log(`Entregables: ${deliverables.length}`);
        console.log(`Invitaciones: ${invitations.length}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

debugTimelineData();