const mysql = require('mysql2/promise');

async function updateUsersAreaTrabajo() {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: 'root',
        database: 'gestion_academica'
    });

    try {
        console.log('🔍 Buscando usuarios sin area_trabajo_id que están en proyectos...');
        
        // Buscar usuarios que están en proyectos pero no tienen area_trabajo_id
        const [usersWithoutArea] = await connection.execute(`
            SELECT DISTINCT u.id, u.email, p.area_trabajo_id, p.titulo as proyecto_titulo
            FROM usuarios u
            JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE (u.area_trabajo_id IS NULL OR u.area_trabajo_id = 0)
            AND pu.estado = 'activo'
            AND p.area_trabajo_id IS NOT NULL
        `);

        console.log(`📊 Encontrados ${usersWithoutArea.length} usuarios para actualizar`);

        for (const user of usersWithoutArea) {
            console.log(`📝 Actualizando usuario ${user.email} (ID: ${user.id}) -> Área: ${user.area_trabajo_id}`);
            
            // Actualizar area_trabajo_id en tabla usuarios
            await connection.execute(`
                UPDATE usuarios 
                SET area_trabajo_id = ?, updated_at = NOW()
                WHERE id = ?
            `, [user.area_trabajo_id, user.id]);

            // Verificar si ya existe en usuario_areas_trabajo
            const [existingRelation] = await connection.execute(`
                SELECT id FROM usuario_areas_trabajo 
                WHERE usuario_id = ? AND area_trabajo_id = ?
            `, [user.id, user.area_trabajo_id]);

            // Si no existe la relación, crearla
            if (existingRelation.length === 0) {
                await connection.execute(`
                    INSERT INTO usuario_areas_trabajo 
                    (usuario_id, area_trabajo_id, es_admin, es_propietario, activo, created_at)
                    VALUES (?, ?, 0, 0, 1, NOW())
                `, [user.id, user.area_trabajo_id]);
                console.log(`  ✅ Creada relación en usuario_areas_trabajo`);
            } else {
                console.log(`  ℹ️  Relación ya existe en usuario_areas_trabajo`);
            }
        }

        console.log('✅ Actualización completada');
        
        // Verificar el resultado
        const [verification] = await connection.execute(`
            SELECT u.id, u.email, u.area_trabajo_id
            FROM usuarios u
            WHERE u.id IN (SELECT DISTINCT pu.usuario_id FROM proyecto_usuarios pu WHERE pu.estado = 'activo')
            AND (u.area_trabajo_id IS NULL OR u.area_trabajo_id = 0)
        `);

        console.log(`📋 Usuarios restantes sin área de trabajo: ${verification.length}`);

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

updateUsersAreaTrabajo();