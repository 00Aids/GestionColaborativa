const { pool } = require('./src/config/database');

async function fixAnanimAreaSimple() {
    try {
        console.log('🔧 CORRIGIENDO ÁREA DE TRABAJO DEL COORDINADOR ANANIM');
        console.log('='.repeat(60));

        // 1. Obtener el área del proyecto asignado
        console.log('\n📋 1. OBTENIENDO ÁREA DEL PROYECTO ASIGNADO:');
        const [projectArea] = await pool.execute(`
            SELECT DISTINCT p.area_trabajo_id, at.nombre as area_nombre
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN areas_trabajo at ON p.area_trabajo_id = at.id
            WHERE pu.usuario_id = 88 AND pu.rol = 'coordinador'
            LIMIT 1
        `);

        if (projectArea.length === 0) {
            console.log('❌ No se encontró proyecto asignado');
            return;
        }

        const areaId = projectArea[0].area_trabajo_id;
        const areaNombre = projectArea[0].area_nombre;
        console.log(`✅ Área encontrada: ID ${areaId} - ${areaNombre}`);

        // 2. Actualizar el coordinador
        console.log('\n📋 2. ACTUALIZANDO COORDINADOR:');
        const [updateResult] = await pool.execute(`
            UPDATE usuarios 
            SET area_trabajo_id = ? 
            WHERE id = 88
        `, [areaId]);

        console.log(`✅ Actualización completada: ${updateResult.affectedRows} fila(s) afectada(s)`);

        // 3. Verificar la actualización
        console.log('\n📋 3. VERIFICANDO ACTUALIZACIÓN:');
        const [updatedCoordinator] = await pool.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.area_trabajo_id, at.nombre as area_nombre
            FROM usuarios u
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.id = 88
        `);

        const coord = updatedCoordinator[0];
        console.log(`✅ Coordinador actualizado:`);
        console.log(`   Nombre: ${coord.nombres} ${coord.apellidos}`);
        console.log(`   Área ID: ${coord.area_trabajo_id}`);
        console.log(`   Área nombre: ${coord.area_nombre}`);

        // 4. Probar consulta de entregables
        console.log('\n📋 4. PROBANDO CONSULTA DE ENTREGABLES:');
        const [entregables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                e.fecha_limite,
                e.fecha_entrega,
                p.titulo as proyecto_titulo,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.area_trabajo_id = ?
            ORDER BY e.created_at DESC
        `, [areaId]);

        console.log(`📊 Entregables encontrados: ${entregables.length}`);
        entregables.forEach((e, index) => {
            console.log(`   ${index + 1}. ${e.titulo} (${e.estado})`);
            console.log(`      Proyecto: ${e.proyecto_titulo}`);
            console.log(`      Estudiante: ${e.estudiante_nombres || 'Sin asignar'} ${e.estudiante_apellidos || ''}`);
            console.log(`      Fecha límite: ${e.fecha_limite}`);
            console.log(`      Fecha entrega: ${e.fecha_entrega || 'No entregado'}`);
            console.log('');
        });

        // 5. Probar el método findByAreaForReview corregido
        console.log('\n📋 5. PROBANDO MÉTODO CORREGIDO findByAreaForReview:');
        const [reviewDeliverables] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos,
                fp.nombre as fase_nombre
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            WHERE p.area_trabajo_id = ? 
            AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'pendiente')
            ORDER BY e.fecha_entrega DESC
        `, [areaId]);

        console.log(`📊 Entregables para revisión: ${reviewDeliverables.length}`);
        reviewDeliverables.forEach((e, index) => {
            console.log(`   ${index + 1}. ${e.titulo} (${e.estado})`);
            console.log(`      Proyecto: ${e.proyecto_titulo}`);
            console.log(`      Estudiante: ${e.estudiante_nombres || 'Sin asignar'} ${e.estudiante_apellidos || ''}`);
        });

        console.log('\n✅ CORRECCIÓN COMPLETADA');
        console.log('='.repeat(60));
        console.log('💡 Ahora el coordinador debería ver sus entregables en la interfaz');

    } catch (error) {
        console.error('❌ Error en la corrección:', error);
    } finally {
        await pool.end();
    }
}

fixAnanimAreaSimple();