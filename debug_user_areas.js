const User = require('./src/models/User');
const { pool } = require('./src/config/database');

async function debugUserAreas() {
    try {
        console.log('🔍 Verificando áreas del usuario pruebagestion3@gmail.com...\n');

        // Obtener información básica del usuario
        const [userRows] = await pool.execute(`
            SELECT u.id, u.email, u.area_trabajo_id, r.nombre as rol_nombre
            FROM usuarios u
            JOIN roles r ON u.rol_id = r.id
            WHERE u.email = ?
        `, ['pruebagestion3@gmail.com']);

        if (userRows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }

        const user = userRows[0];
        console.log('👤 Usuario en tabla usuarios:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Área de trabajo ID: ${user.area_trabajo_id}`);
        console.log(`   Rol: ${user.rol_nombre}\n`);

        // Verificar qué devuelve getUserAreas
        const userModel = new User();
        const userAreas = await userModel.getUserAreas(user.id);
        
        console.log('🏢 Áreas devueltas por getUserAreas:');
        if (userAreas.length === 0) {
            console.log('   ❌ No se encontraron áreas');
        } else {
            userAreas.forEach((area, index) => {
                console.log(`   ${index + 1}. Área ID: ${area.area_trabajo_id || area.id}`);
                console.log(`      Nombre: ${area.nombre || area.area_nombre || 'N/A'}`);
                console.log(`      Código: ${area.codigo || area.area_codigo || 'N/A'}`);
                console.log('');
            });
            
            console.log(`📌 Primera área (la que usa el middleware): ${userAreas[0].area_trabajo_id || userAreas[0].id}`);
        }

        // Verificar si hay discrepancia
        const firstAreaId = userAreas.length > 0 ? (userAreas[0].area_trabajo_id || userAreas[0].id) : null;
        if (firstAreaId && firstAreaId !== user.area_trabajo_id) {
            console.log('\n⚠️  DISCREPANCIA DETECTADA:');
            console.log(`   Usuario.area_trabajo_id: ${user.area_trabajo_id}`);
            console.log(`   Primera área de getUserAreas: ${firstAreaId}`);
        } else {
            console.log('\n✅ Las áreas coinciden correctamente');
        }

        // 🔧 Corrección puntual si no tiene área primaria pero sí proyectos asignados
        console.log('\n🔧 Intentando corregir área primaria y relación de área...');
        if (!user.area_trabajo_id) {
            // Buscar un proyecto donde el usuario participa y usar su área (proyecto_usuarios primero, luego project_members)
            let targetAreaId = null;

            const [assignedProjectsPU] = await pool.execute(`
                SELECT p.id, p.titulo, p.area_trabajo_id
                FROM proyectos p
                JOIN proyecto_usuarios pu ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = ? AND pu.estado = 'activo' AND p.area_trabajo_id IS NOT NULL
                ORDER BY p.id LIMIT 1
            `, [user.id]);

            if (assignedProjectsPU.length > 0) {
                targetAreaId = assignedProjectsPU[0].area_trabajo_id;
            } else {
                const [assignedProjectsPM] = await pool.execute(`
                    SELECT p.id, p.titulo, p.area_trabajo_id
                    FROM proyectos p
                    JOIN project_members pm ON pm.proyecto_id = p.id
                    WHERE pm.usuario_id = ? AND pm.activo = 1 AND p.area_trabajo_id IS NOT NULL
                    ORDER BY p.id LIMIT 1
                `, [user.id]);

                if (assignedProjectsPM.length > 0) {
                    targetAreaId = assignedProjectsPM[0].area_trabajo_id;
                }
            }

            if (targetAreaId) {
                console.log(`   🎯 Área objetivo desde proyecto: ${targetAreaId}`);

                // Verificar/crear relación en usuario_areas_trabajo
                const [exists] = await pool.execute(
                    'SELECT 1 FROM usuario_areas_trabajo WHERE usuario_id = ? AND area_trabajo_id = ? AND activo = 1',
                    [user.id, targetAreaId]
                );
                
                if (exists.length === 0) {
                    await pool.execute(
                        'INSERT INTO usuario_areas_trabajo (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at) VALUES (?, ?, 0, 0, 1, NOW())',
                        [user.id, targetAreaId]
                    );
                    console.log('   ✅ Relación en usuario_areas_trabajo creada');
                } else {
                    console.log('   ℹ️ Relación de área ya existía activa');
                }

                // Actualizar área primaria si está NULL/0
                await pool.execute(
                    'UPDATE usuarios SET area_trabajo_id = ?, updated_at = NOW() WHERE id = ? AND (area_trabajo_id IS NULL OR area_trabajo_id = 0)',
                    [targetAreaId, user.id]
                );
                console.log('   ✅ Área primaria actualizada');
            } else {
                console.log('   ❌ No se encontraron proyectos asignados con área definida');
            }
        } else {
            console.log('   ℹ️ Usuario ya tiene área primaria, no es necesario corregir');
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await pool.end();
    }
}

debugUserAreas();