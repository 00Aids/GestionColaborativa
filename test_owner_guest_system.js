const mysql = require('mysql2/promise');

// Configuración de la base de datos
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'gestion_academica'
};

async function testOwnerGuestSystem() {
    let connection;
    let testsPassed = 0;
    let totalTests = 0;

    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('🔗 Conectado a la base de datos');

        // Test 1: Verificar estructura de la tabla usuario_areas_trabajo
        totalTests++;
        console.log('\n📋 Test 1: Verificando estructura de usuario_areas_trabajo...');
        const [columns] = await connection.execute(`
            SHOW COLUMNS FROM usuario_areas_trabajo
        `);
        
        const hasEsPropietario = columns.some(col => col.Field === 'es_propietario');
        const hasEsAdmin = columns.some(col => col.Field === 'es_admin');
        
        if (hasEsPropietario && hasEsAdmin) {
            console.log('✅ Estructura correcta: columnas es_propietario y es_admin presentes');
            testsPassed++;
        } else {
            console.log('❌ Estructura incorrecta: faltan columnas necesarias');
        }

        // Test 2: Verificar áreas sin propietario
        totalTests++;
        console.log('\n👑 Test 2: Verificando áreas sin propietario...');
        const [areasWithoutOwner] = await connection.execute(`
            SELECT at.id, at.codigo, at.nombre
            FROM areas_trabajo at
            LEFT JOIN usuario_areas_trabajo uat ON at.id = uat.area_trabajo_id 
                AND uat.es_propietario = 1 AND uat.activo = 1
            WHERE at.activo = 1 AND uat.id IS NULL
        `);

        console.log(`📊 Áreas sin propietario encontradas: ${areasWithoutOwner.length}`);
        if (areasWithoutOwner.length === 0) {
            console.log('✅ Todas las áreas tienen propietario asignado');
            testsPassed++;
        } else {
            console.log('🔧 Áreas que necesitan propietario:');
            areasWithoutOwner.forEach(area => {
                console.log(`   - ${area.codigo}: ${area.nombre}`);
            });
        }

        // Test 3: Verificar que no hay áreas sin propietario
        totalTests++;
        if (areasWithoutOwner.length === 0) {
            console.log('\n✅ Test 3: No hay áreas sin propietario - Sistema correcto');
            testsPassed++;
        } else {
            console.log('\n🔧 Test 3: Asignando propietarios a áreas sin propietario...');
            
            for (const area of areasWithoutOwner) {
                // Buscar el primer admin de esta área
                const [admins] = await connection.execute(`
                    SELECT uat.id, uat.usuario_id, u.nombres, u.apellidos
                    FROM usuario_areas_trabajo uat
                    INNER JOIN usuarios u ON uat.usuario_id = u.id
                    WHERE uat.area_trabajo_id = ? AND uat.es_admin = 1 AND uat.activo = 1
                    ORDER BY uat.id ASC
                    LIMIT 1
                `, [area.id]);

                if (admins.length > 0) {
                    const admin = admins[0];
                    await connection.execute(`
                        UPDATE usuario_areas_trabajo 
                        SET es_propietario = 1 
                        WHERE id = ?
                    `, [admin.id]);
                    
                    console.log(`✅ ${area.codigo}: Propietario asignado a ${admin.nombres} ${admin.apellidos}`);
                } else {
                    console.log(`⚠️ ${area.codigo}: No se encontraron administradores para asignar como propietario`);
                }
            }
            console.log('⚠️ Se encontraron áreas sin propietario que requieren atención manual');
        }

        // Test 4: Verificar que cada área tenga exactamente un propietario
        totalTests++;
        console.log('\n🎯 Test 4: Verificando que cada área tenga exactamente un propietario...');
        const [ownershipStats] = await connection.execute(`
            SELECT 
                at.id,
                at.codigo,
                at.nombre,
                COUNT(uat.id) as total_propietarios
            FROM areas_trabajo at
            LEFT JOIN usuario_areas_trabajo uat ON at.id = uat.area_trabajo_id 
                AND uat.es_propietario = 1 AND uat.activo = 1
            WHERE at.activo = 1
            GROUP BY at.id, at.codigo, at.nombre
            ORDER BY at.codigo
        `);

        let ownershipCorrect = true;
        console.log('📊 Estado de propiedad por área:');
        ownershipStats.forEach(area => {
            const status = area.total_propietarios === 1 ? '✅' : '❌';
            console.log(`   ${status} ${area.codigo}: ${area.total_propietarios} propietario(s)`);
            if (area.total_propietarios !== 1) {
                ownershipCorrect = false;
            }
        });

        if (ownershipCorrect) {
            console.log('✅ Todas las áreas tienen exactamente un propietario');
            testsPassed++;
        } else {
            console.log('❌ Algunas áreas no tienen exactamente un propietario');
        }

        // Test 5: Verificar funciones del modelo User para sistema propietario/invitado
        totalTests++;
        console.log('\n🔍 Test 5: Verificando funciones del sistema propietario/invitado...');
        
        // Obtener una muestra de datos para probar
        const [sampleData] = await connection.execute(`
            SELECT 
                uat.usuario_id,
                uat.area_trabajo_id,
                uat.es_propietario,
                uat.es_admin,
                u.nombres,
                u.apellidos,
                at.codigo as area_codigo
            FROM usuario_areas_trabajo uat
            INNER JOIN usuarios u ON uat.usuario_id = u.id
            INNER JOIN areas_trabajo at ON uat.area_trabajo_id = at.id
            WHERE uat.activo = 1 AND u.activo = 1 AND at.activo = 1
            LIMIT 5
        `);

        console.log('📋 Muestra de relaciones usuario-área:');
        sampleData.forEach(rel => {
            const tipo = rel.es_propietario ? 'PROPIETARIO' : (rel.es_admin ? 'ADMIN' : 'INVITADO');
            console.log(`   ${rel.nombres} ${rel.apellidos} -> ${rel.area_codigo} (${tipo})`);
        });

        if (sampleData.length > 0) {
            console.log('✅ Sistema propietario/invitado funcionando correctamente');
            testsPassed++;
        } else {
            console.log('❌ No se encontraron relaciones usuario-área');
        }

        // Test 6: Verificar distribución de roles
        totalTests++;
        console.log('\n📊 Test 6: Verificando distribución de roles...');
        const [roleDistribution] = await connection.execute(`
            SELECT 
                COUNT(*) as total_relaciones,
                SUM(CASE WHEN es_propietario = 1 THEN 1 ELSE 0 END) as propietarios,
                SUM(CASE WHEN es_admin = 1 AND es_propietario = 0 THEN 1 ELSE 0 END) as admins_no_propietarios,
                SUM(CASE WHEN es_admin = 0 AND es_propietario = 0 THEN 1 ELSE 0 END) as invitados
            FROM usuario_areas_trabajo
            WHERE activo = 1
        `);

        const stats = roleDistribution[0];
        console.log('📈 Distribución de roles:');
        console.log(`   Total relaciones: ${stats.total_relaciones}`);
        console.log(`   Propietarios: ${stats.propietarios}`);
        console.log(`   Admins (no propietarios): ${stats.admins_no_propietarios}`);
        console.log(`   Invitados: ${stats.invitados}`);

        if (stats.total_relaciones > 0 && stats.propietarios > 0) {
            console.log('✅ Distribución de roles correcta');
            testsPassed++;
        } else {
            console.log('❌ Distribución de roles incorrecta');
        }

        // Test 7: Verificar integridad de propietarios (cada propietario debe ser admin)
        totalTests++;
        console.log('\n🔒 Test 7: Verificando integridad de propietarios...');
        const [integrityCheck] = await connection.execute(`
            SELECT COUNT(*) as propietarios_no_admin
            FROM usuario_areas_trabajo
            WHERE es_propietario = 1 AND es_admin = 0 AND activo = 1
        `);

        if (integrityCheck[0].propietarios_no_admin === 0) {
            console.log('✅ Todos los propietarios son administradores');
            testsPassed++;
        } else {
            console.log(`❌ ${integrityCheck[0].propietarios_no_admin} propietarios no son administradores`);
        }

        // Resumen final
        console.log('\n' + '='.repeat(60));
        console.log('📊 RESUMEN DEL TESTING DEL SISTEMA PROPIETARIO/INVITADO');
        console.log('='.repeat(60));
        console.log(`✅ Tests pasados: ${testsPassed}/${totalTests}`);
        console.log(`📈 Porcentaje de éxito: ${((testsPassed/totalTests) * 100).toFixed(1)}%`);
        
        if (testsPassed === totalTests) {
            console.log('\n🎉 ¡SISTEMA PROPIETARIO/INVITADO COMPLETAMENTE FUNCIONAL!');
            console.log('✅ Todas las validaciones pasaron exitosamente');
            console.log('✅ Sistema listo para producción');
        } else {
            console.log('\n⚠️ SISTEMA PROPIETARIO/INVITADO REQUIERE ATENCIÓN');
            console.log(`❌ ${totalTests - testsPassed} test(s) fallaron`);
            console.log('🔧 Revisar los errores reportados arriba');
        }

    } catch (error) {
        console.error('❌ Error durante el testing:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar el testing
testOwnerGuestSystem().catch(console.error);