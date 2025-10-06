const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugUserAreasMethod() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 DEBUGGING getUserAreas METHOD vs PERMISSION VALIDATION');
        console.log('='.repeat(70));

        const coordinatorId = 22; // nuevocoordinador1@test.com
        const projectAreaId = 2;

        // 1. Probar el método getUserAreas real (como en User.js)
        console.log('📋 MÉTODO getUserAreas REAL:');
        const [realUserAreas] = await connection.execute(`
            SELECT a.*, uat.created_at as fecha_asignacion, uat.es_admin, uat.es_propietario, a.id as area_trabajo_id
            FROM areas_trabajo a
            INNER JOIN usuario_areas_trabajo uat ON a.id = uat.area_trabajo_id
            WHERE uat.usuario_id = ? AND uat.activo = 1 AND a.activo = 1
            ORDER BY uat.es_propietario DESC, uat.es_admin DESC, a.codigo
        `, [coordinatorId]);

        console.log(`   Áreas encontradas: ${realUserAreas.length}`);
        realUserAreas.forEach(area => {
            console.log(`   - Área ID: ${area.area_trabajo_id}, Nombre: ${area.nombre}`);
            console.log(`     Es admin: ${area.es_admin}, Es propietario: ${area.es_propietario}`);
        });

        // 2. Verificar si existe la tabla usuario_areas_trabajo
        console.log('\n🗃️ VERIFICANDO TABLA usuario_areas_trabajo:');
        try {
            const [tableCheck] = await connection.execute(`
                SELECT COUNT(*) as count FROM usuario_areas_trabajo WHERE usuario_id = ?
            `, [coordinatorId]);
            console.log(`   ✅ Tabla existe. Registros para coordinador: ${tableCheck[0].count}`);
        } catch (error) {
            console.log(`   ❌ Error con tabla usuario_areas_trabajo: ${error.message}`);
        }

        // 3. Verificar el área_trabajo_id directo del usuario (método simple)
        console.log('\n👤 ÁREA DIRECTA DEL USUARIO:');
        const [userDirect] = await connection.execute(`
            SELECT area_trabajo_id FROM usuarios WHERE id = ?
        `, [coordinatorId]);
        
        if (userDirect[0].area_trabajo_id) {
            console.log(`   Área directa: ${userDirect[0].area_trabajo_id}`);
            
            // Simular el método simple que podría estar usando el controlador
            const simpleUserAreas = [{ area_trabajo_id: userDirect[0].area_trabajo_id }];
            const hasAccessSimple = simpleUserAreas.some(area => area.area_trabajo_id === projectAreaId);
            console.log(`   ¿Coincide con proyecto?: ${hasAccessSimple ? '✅ SÍ' : '❌ NO'}`);
        }

        // 4. Verificar si el problema está en la lógica del controlador
        console.log('\n🔍 SIMULANDO LÓGICA DEL CONTROLADOR:');
        
        // Método real getUserAreas
        const hasAccessReal = realUserAreas.some(area => area.area_trabajo_id === projectAreaId);
        console.log(`   Con getUserAreas real: ${hasAccessReal ? '✅ SÍ' : '❌ NO'}`);

        // 5. Verificar si hay algún problema con el estado activo
        console.log('\n⚡ VERIFICANDO ESTADOS ACTIVOS:');
        
        const [areaStatus] = await connection.execute(`
            SELECT id, nombre, activo FROM areas_trabajo WHERE id = ?
        `, [projectAreaId]);
        
        if (areaStatus.length > 0) {
            console.log(`   Área ${projectAreaId}: ${areaStatus[0].nombre}, Activo: ${areaStatus[0].activo}`);
        }

        const [userAreaStatus] = await connection.execute(`
            SELECT * FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ?
        `, [coordinatorId, projectAreaId]);

        if (userAreaStatus.length > 0) {
            console.log(`   Asignación usuario-área: Activo: ${userAreaStatus[0].activo}`);
        } else {
            console.log(`   ❌ No hay asignación en usuario_areas_trabajo`);
            
            // Verificar si necesitamos crear la asignación
            console.log('\n💡 CREANDO ASIGNACIÓN EN usuario_areas_trabajo:');
            try {
                await connection.execute(`
                    INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at)
                    VALUES (?, ?, 0, 0, 1, NOW())
                `, [coordinatorId, projectAreaId]);
                console.log('   ✅ Asignación creada exitosamente');
                
                // Probar nuevamente
                const [newUserAreas] = await connection.execute(`
                    SELECT a.*, uat.created_at as fecha_asignacion, uat.es_admin, uat.es_propietario, a.id as area_trabajo_id
                    FROM areas_trabajo a
                    INNER JOIN usuario_areas_trabajo uat ON a.id = uat.area_trabajo_id
                    WHERE uat.usuario_id = ? AND uat.activo = 1 AND a.activo = 1
                    ORDER BY uat.es_propietario DESC, uat.es_admin DESC, a.codigo
                `, [coordinatorId]);
                
                const hasAccessAfterFix = newUserAreas.some(area => area.area_trabajo_id === projectAreaId);
                console.log(`   ✅ Acceso después del fix: ${hasAccessAfterFix ? 'SÍ' : 'NO'}`);
                
            } catch (insertError) {
                console.log(`   ❌ Error creando asignación: ${insertError.message}`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

debugUserAreasMethod();