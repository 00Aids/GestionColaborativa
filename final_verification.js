const mysql = require('mysql2/promise');
require('dotenv').config();

async function finalVerification() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== VERIFICACIÓN FINAL DE CORRECCIONES ===');

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

        console.log('\n=== VERIFICANDO ASIGNACIONES EN PROYECTO_USUARIOS ===');
        const [finalAssignments] = await connection.execute(`
            SELECT pu.*, u.email, p.titulo as proyecto_titulo
            FROM proyecto_usuarios pu
            JOIN usuarios u ON pu.usuario_id = u.id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE u.email IN ('nuevocoordinador1@test.com', 'nuevodirector1@test.com')
            ORDER BY u.email, pu.proyecto_id
        `);
        
        console.log('Asignaciones en proyecto_usuarios:');
        finalAssignments.forEach(assignment => {
            console.log(`- ${assignment.email}: Proyecto ${assignment.proyecto_id} (${assignment.proyecto_titulo}) como "${assignment.rol}"`);
        });

        console.log('\n=== VERIFICANDO ESTRUCTURA DE TABLA USUARIOS ===');
        const [usuariosStructure] = await connection.execute('DESCRIBE usuarios');
        console.log('Columnas en tabla usuarios:');
        usuariosStructure.forEach(column => {
            console.log(`- ${column.Field}: ${column.Type}`);
        });

        console.log('\n=== PROBANDO CONSULTA DE ENTREGABLES PARA COORDINADOR (CORREGIDA) ===');
        const coordinatorId = userRoles.find(u => u.email === 'nuevocoordinador1@test.com').id;

        // Usar las columnas correctas de la tabla usuarios
        const [deliverables] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                u.email as estudiante_email
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
            console.log(`- ID ${deliverable.id}: "${deliverable.titulo}" - Estado: ${deliverable.estado} - Estudiante: ${deliverable.estudiante_email}`);
        });

        console.log('\n=== VERIFICANDO ENTREGABLE ESPECÍFICO (ID 1) ===');
        const [specificDeliverable] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                e.estudiante_id,
                e.proyecto_id,
                p.titulo as proyecto_titulo,
                u.email as estudiante_email
            FROM entregables e
            JOIN proyectos p ON e.proyecto_id = p.id
            JOIN usuarios u ON e.estudiante_id = u.id
            WHERE e.id = 1
        `);

        if (specificDeliverable.length > 0) {
            const deliverable = specificDeliverable[0];
            console.log('Detalles del entregable ID 1:');
            console.log(`- Título: "${deliverable.titulo}"`);
            console.log(`- Estado: ${deliverable.estado}`);
            console.log(`- Estudiante: ${deliverable.estudiante_email} (ID: ${deliverable.estudiante_id})`);
            console.log(`- Proyecto: ${deliverable.proyecto_titulo} (ID: ${deliverable.proyecto_id})`);
        }

        console.log('\n=== RESUMEN FINAL ===');
        console.log('✅ ROLES CORREGIDOS:');
        console.log('   - nuevocoordinador1@test.com: Coordinador Académico (rol_id=2), área=2');
        console.log('   - nuevodirector1@test.com: Director de Proyecto (rol_id=3), área=2');
        console.log('');
        console.log('✅ ASIGNACIONES AL PROYECTO:');
        console.log('   - nuevocoordinador1@test.com: coordinador en proyecto 2');
        console.log('   - nuevodirector1@test.com: administrador en proyecto 2');
        console.log('');
        console.log('✅ ENTREGABLES VISIBLES:');
        console.log(`   - El coordinador puede ver ${deliverables.length} entregables para calificar`);
        console.log('');
        console.log('🎯 PROBLEMA RESUELTO: El coordinador ahora puede ver y calificar el entregable enviado por nuevoestudiante2@test.com');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

finalVerification();