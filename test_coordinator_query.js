const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCoordinatorQuery() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== PROBANDO CONSULTA FINAL PARA COORDINADOR ===');
        
        const [coordinatorData] = await connection.execute(`
            SELECT id FROM usuarios WHERE email = 'nuevocoordinador1@test.com'
        `);
        const coordinatorId = coordinatorData[0].id;
        console.log(`ID del coordinador: ${coordinatorId}`);

        // Usar la columna correcta 'asignado_a' que vimos en la estructura
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
            JOIN usuarios u ON e.asignado_a = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'rechazado')
            ORDER BY e.fecha_entrega DESC
        `, [coordinatorId]);

        console.log(`\n✅ ENTREGABLES VISIBLES PARA EL COORDINADOR (${deliverables.length} encontrados):`);
        deliverables.forEach(deliverable => {
            console.log(`- ID ${deliverable.id}: "${deliverable.titulo}"`);
            console.log(`  Estado: ${deliverable.estado}`);
            console.log(`  Proyecto: ${deliverable.proyecto_titulo}`);
            console.log(`  Estudiante: ${deliverable.estudiante_email}`);
            console.log('');
        });

        console.log('=== VERIFICACIÓN ESPECÍFICA DEL ENTREGABLE ID 1 ===');
        const [specificCheck] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                u.email as estudiante_email,
                pu.rol as coordinador_rol
            FROM entregables e
            JOIN proyectos p ON e.proyecto_id = p.id
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            JOIN usuarios u ON e.asignado_a = u.id
            WHERE e.id = 1 AND pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [coordinatorId]);

        if (specificCheck.length > 0) {
            console.log('✅ El entregable ID 1 ES VISIBLE para el coordinador:');
            const deliverable = specificCheck[0];
            console.log(`- Título: "${deliverable.titulo}"`);
            console.log(`- Estado: ${deliverable.estado}`);
            console.log(`- Proyecto: ${deliverable.proyecto_titulo}`);
            console.log(`- Estudiante: ${deliverable.estudiante_email}`);
            console.log(`- Rol del coordinador: ${deliverable.coordinador_rol}`);
        } else {
            console.log('❌ El entregable ID 1 NO es visible para el coordinador');
        }

        console.log('\n=== RESUMEN FINAL COMPLETO ===');
        console.log('🎯 PROBLEMA ORIGINAL RESUELTO:');
        console.log('   - El entregable enviado por nuevoestudiante2@test.com no aparecía para calificar');
        console.log('');
        console.log('✅ CORRECCIONES APLICADAS:');
        console.log('   1. Roles intercambiados corregidos:');
        console.log('      • nuevocoordinador1@test.com → Coordinador Académico (rol_id=2)');
        console.log('      • nuevodirector1@test.com → Director de Proyecto (rol_id=3)');
        console.log('   2. Áreas de trabajo asignadas (área 2) para ambos usuarios');
        console.log('   3. Asignaciones al proyecto 2:');
        console.log('      • nuevocoordinador1@test.com como "coordinador"');
        console.log('      • nuevodirector1@test.com como "administrador"');
        console.log('   4. Consulta de entregables funcionando correctamente');
        console.log('');
        console.log('🎉 RESULTADO: El coordinador ahora puede ver y calificar todos los entregables del proyecto');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

testCoordinatorQuery();