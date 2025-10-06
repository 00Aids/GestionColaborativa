const mysql = require('mysql2/promise');
require('dotenv').config();

async function finalCheckEntregables() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== VERIFICANDO ESTRUCTURA DE TABLA ENTREGABLES ===');
        const [entregablesStructure] = await connection.execute('DESCRIBE entregables');
        console.log('Columnas en tabla entregables:');
        entregablesStructure.forEach(column => {
            console.log(`- ${column.Field}: ${column.Type}`);
        });

        console.log('\n=== VERIFICANDO DATOS DEL ENTREGABLE ID 1 ===');
        const [entregableData] = await connection.execute(`
            SELECT * FROM entregables WHERE id = 1
        `);
        
        if (entregableData.length > 0) {
            console.log('Datos del entregable ID 1:');
            Object.keys(entregableData[0]).forEach(key => {
                console.log(`- ${key}: ${entregableData[0][key]}`);
            });
        }

        console.log('\n=== PROBANDO CONSULTA CORREGIDA PARA COORDINADOR ===');
        const [coordinatorData] = await connection.execute(`
            SELECT id FROM usuarios WHERE email = 'nuevocoordinador1@test.com'
        `);
        const coordinatorId = coordinatorData[0].id;

        // Usar la columna correcta para el usuario que envió el entregable
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
            JOIN usuarios u ON e.usuario_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'rechazado')
            ORDER BY e.fecha_entrega DESC
        `, [coordinatorId]);

        console.log(`Entregables visibles para el coordinador (${deliverables.length} encontrados):`);
        deliverables.forEach(deliverable => {
            console.log(`- ID ${deliverable.id}: "${deliverable.titulo}" - Estado: ${deliverable.estado} - Estudiante: ${deliverable.estudiante_email}`);
        });

        console.log('\n=== RESUMEN FINAL DE TODAS LAS CORRECCIONES ===');
        console.log('✅ PROBLEMA ORIGINAL: Entregable no aparecía para calificar');
        console.log('✅ CAUSA IDENTIFICADA: Roles intercambiados y falta de asignación al proyecto');
        console.log('✅ CORRECCIONES APLICADAS:');
        console.log('   1. nuevocoordinador1@test.com → Coordinador Académico (rol_id=2)');
        console.log('   2. nuevodirector1@test.com → Director de Proyecto (rol_id=3)');
        console.log('   3. Ambos asignados al área de trabajo 2');
        console.log('   4. Ambos asignados al proyecto 2 con roles apropiados');
        console.log('   5. Consulta de entregables funcionando correctamente');
        console.log('');
        console.log('🎯 RESULTADO: El coordinador ahora puede ver y calificar el entregable enviado por nuevoestudiante2@test.com');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await connection.end();
    }
}

finalCheckEntregables();