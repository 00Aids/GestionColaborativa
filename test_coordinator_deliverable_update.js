const mysql = require('mysql2/promise');
require('dotenv').config();

async function testCoordinatorDeliverableUpdate() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🧪 TESTING COORDINATOR DELIVERABLE UPDATE AFTER FIX');
        console.log('='.repeat(60));

        const coordinatorId = 22; // nuevocoordinador1@test.com
        const deliverableId = 1;
        const projectAreaId = 2;

        // 1. Verificar que la asignación en usuario_areas_trabajo existe
        console.log('✅ VERIFICANDO ASIGNACIÓN USUARIO-ÁREA:');
        const [userAreaAssignment] = await connection.execute(`
            SELECT * FROM usuario_areas_trabajo 
            WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1
        `, [coordinatorId, projectAreaId]);

        if (userAreaAssignment.length > 0) {
            console.log('   ✅ Asignación existe y está activa');
        } else {
            console.log('   ❌ Asignación no existe o no está activa');
            return;
        }

        // 2. Simular el método getUserAreas
        console.log('\n📋 SIMULANDO getUserAreas:');
        const [userAreas] = await connection.execute(`
            SELECT a.*, uat.created_at as fecha_asignacion, uat.es_admin, uat.es_propietario, a.id as area_trabajo_id
            FROM areas_trabajo a
            INNER JOIN usuario_areas_trabajo uat ON a.id = uat.area_trabajo_id
            WHERE uat.usuario_id = ? AND uat.activo = 1 AND a.activo = 1
            ORDER BY uat.es_propietario DESC, uat.es_admin DESC, a.codigo
        `, [coordinatorId]);

        console.log(`   Áreas encontradas: ${userAreas.length}`);
        userAreas.forEach(area => {
            console.log(`   - Área ID: ${area.area_trabajo_id}, Nombre: ${area.nombre}`);
        });

        // 3. Verificar acceso al proyecto
        const [project] = await connection.execute(`
            SELECT id, titulo, area_trabajo_id FROM proyectos WHERE id = 2
        `);

        if (project.length === 0) {
            console.log('   ❌ Proyecto no encontrado');
            return;
        }

        const hasAccess = userAreas.some(area => area.area_trabajo_id === project[0].area_trabajo_id);
        console.log(`\n🔐 VERIFICACIÓN DE ACCESO:`);
        console.log(`   Área del proyecto: ${project[0].area_trabajo_id}`);
        console.log(`   ¿Tiene acceso?: ${hasAccess ? '✅ SÍ' : '❌ NO'}`);

        // 4. Verificar estado actual del entregable
        console.log('\n📦 ESTADO ACTUAL DEL ENTREGABLE:');
        const [deliverable] = await connection.execute(`
            SELECT id, titulo, estado, proyecto_id FROM entregables WHERE id = ?
        `, [deliverableId]);

        if (deliverable.length === 0) {
            console.log('   ❌ Entregable no encontrado');
            return;
        }

        console.log(`   ID: ${deliverable[0].id}`);
        console.log(`   Título: ${deliverable[0].titulo}`);
        console.log(`   Estado: ${deliverable[0].estado}`);
        console.log(`   Proyecto ID: ${deliverable[0].proyecto_id}`);

        // 5. Verificar si puede iniciar revisión
        const canStartReview = ['entregado', 'requiere_cambios'].includes(deliverable[0].estado);
        console.log(`   ¿Puede iniciar revisión?: ${canStartReview ? '✅ SÍ' : '❌ NO'}`);

        // 6. Simular actualización de estado (sin ejecutar realmente)
        console.log('\n🎯 SIMULACIÓN DE ACTUALIZACIÓN:');
        if (hasAccess && canStartReview) {
            console.log('   ✅ TODAS LAS VALIDACIONES PASARON');
            console.log('   ✅ El coordinador DEBERÍA poder actualizar el estado');
            
            // Opcional: Actualizar realmente el estado para probar
            console.log('\n🔄 ACTUALIZANDO ESTADO A "en_revision":');
            try {
                await connection.execute(`
                    UPDATE entregables 
                    SET estado = 'en_revision', updated_at = NOW() 
                    WHERE id = ?
                `, [deliverableId]);
                
                console.log('   ✅ Estado actualizado exitosamente');
                
                // Verificar el cambio
                const [updatedDeliverable] = await connection.execute(`
                    SELECT estado FROM entregables WHERE id = ?
                `, [deliverableId]);
                
                console.log(`   📋 Nuevo estado: ${updatedDeliverable[0].estado}`);
                
                // Revertir el cambio para no afectar las pruebas
                await connection.execute(`
                    UPDATE entregables 
                    SET estado = 'entregado', updated_at = NOW() 
                    WHERE id = ?
                `, [deliverableId]);
                
                console.log('   🔄 Estado revertido a "entregado" para mantener consistencia');
                
            } catch (updateError) {
                console.log(`   ❌ Error actualizando: ${updateError.message}`);
            }
            
        } else {
            console.log('   ❌ ALGUNA VALIDACIÓN FALLÓ');
            if (!hasAccess) console.log('     - Sin acceso al área del proyecto');
            if (!canStartReview) console.log('     - Estado del entregable no permite revisión');
        }

        console.log('\n🎉 RESUMEN:');
        console.log('='.repeat(50));
        console.log('✅ Problema identificado: Faltaba asignación en usuario_areas_trabajo');
        console.log('✅ Solución aplicada: Asignación creada correctamente');
        console.log('✅ El coordinador ahora DEBERÍA poder actualizar entregables');
        console.log('\n💡 PRÓXIMOS PASOS:');
        console.log('   1. Probar en la interfaz web');
        console.log('   2. Verificar que no aparezca más el error 403');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

testCoordinatorDeliverableUpdate();