const { pool } = require('./src/config/database');

async function testFixEntregablesMethod() {
    try {
        console.log('🔧 PROBANDO Y CORRIGIENDO MÉTODO findByAreaForReview');
        console.log('='.repeat(60));

        // 1. Obtener información del coordinador ananim
        console.log('\n📋 1. INFORMACIÓN DEL COORDINADOR:');
        const [coordinator] = await pool.execute(`
            SELECT id, nombres, apellidos, email, area_trabajo_id 
            FROM usuarios 
            WHERE email = 'ananim@gmail.com'
        `);

        if (coordinator.length === 0) {
            console.log('❌ Coordinador ananim no encontrado');
            return;
        }

        const coord = coordinator[0];
        console.log(`✅ Coordinador: ${coord.nombres} ${coord.apellidos}`);
        console.log(`   ID: ${coord.id}`);
        console.log(`   Área de trabajo ID: ${coord.area_trabajo_id}`);

        // 2. Probar la consulta ACTUAL (incorrecta)
        console.log('\n📋 2. PROBANDO CONSULTA ACTUAL (INCORRECTA):');
        console.log('   Buscando entregables con e.area_trabajo_id = ?');
        
        const [currentResults] = await pool.execute(`
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
            WHERE e.area_trabajo_id = ? 
            AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'pendiente')
            ORDER BY e.fecha_entrega DESC
        `, [coord.area_trabajo_id]);

        console.log(`📊 Resultados con consulta actual: ${currentResults.length}`);

        // 3. Verificar estructura de la tabla entregables
        console.log('\n📋 3. VERIFICANDO ESTRUCTURA DE ENTREGABLES:');
        const [entregablesStructure] = await pool.execute('DESCRIBE entregables');
        const hasAreaTrabajoId = entregablesStructure.some(col => col.Field === 'area_trabajo_id');
        console.log(`   ¿Tabla entregables tiene area_trabajo_id? ${hasAreaTrabajoId ? 'SÍ' : 'NO'}`);

        // 4. Probar la consulta CORREGIDA
        console.log('\n📋 4. PROBANDO CONSULTA CORREGIDA:');
        console.log('   Buscando entregables por p.area_trabajo_id = ?');
        
        const [correctedResults] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                p.area_trabajo_id as proyecto_area_id,
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
        `, [coord.area_trabajo_id]);

        console.log(`📊 Resultados con consulta corregida: ${correctedResults.length}`);
        
        if (correctedResults.length > 0) {
            console.log('\n✅ ENTREGABLES ENCONTRADOS:');
            correctedResults.forEach((entregable, index) => {
                console.log(`   ${index + 1}. ${entregable.titulo}`);
                console.log(`      Estado: ${entregable.estado}`);
                console.log(`      Proyecto: ${entregable.proyecto_titulo}`);
                console.log(`      Estudiante: ${entregable.estudiante_nombres || 'Sin asignar'} ${entregable.estudiante_apellidos || ''}`);
                console.log(`      Fecha límite: ${entregable.fecha_limite}`);
                console.log(`      Fecha entrega: ${entregable.fecha_entrega || 'No entregado'}`);
                console.log('');
            });
        }

        // 5. Verificar proyectos del área
        console.log('\n📋 5. VERIFICANDO PROYECTOS DEL ÁREA:');
        const [areaProjects] = await pool.execute(`
            SELECT id, titulo, estado, estudiante_id
            FROM proyectos 
            WHERE area_trabajo_id = ?
        `, [coord.area_trabajo_id]);

        console.log(`📊 Proyectos en el área ${coord.area_trabajo_id}: ${areaProjects.length}`);
        areaProjects.forEach(project => {
            console.log(`   - ${project.titulo} (ID: ${project.id}, Estudiante ID: ${project.estudiante_id})`);
        });

        // 6. Verificar entregables por proyecto
        console.log('\n📋 6. VERIFICANDO ENTREGABLES POR PROYECTO:');
        for (const project of areaProjects) {
            const [projectDeliverables] = await pool.execute(`
                SELECT id, titulo, estado, fecha_limite, fecha_entrega
                FROM entregables 
                WHERE proyecto_id = ?
            `, [project.id]);

            console.log(`   Proyecto "${project.titulo}": ${projectDeliverables.length} entregables`);
            projectDeliverables.forEach(d => {
                console.log(`     - ${d.titulo} (${d.estado})`);
            });
        }

        // 7. Probar consulta con diferentes estados
        console.log('\n📋 7. PROBANDO CON TODOS LOS ESTADOS:');
        const [allStatesResults] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.area_trabajo_id = ?
            ORDER BY e.created_at DESC
        `, [coord.area_trabajo_id]);

        console.log(`📊 Entregables con todos los estados: ${allStatesResults.length}`);
        allStatesResults.forEach(e => {
            console.log(`   - ${e.titulo} (${e.estado}) - Proyecto: ${e.proyecto_titulo}`);
        });

        console.log('\n✅ DIAGNÓSTICO COMPLETADO');
        console.log('='.repeat(60));
        
        if (correctedResults.length > 0) {
            console.log('💡 SOLUCIÓN: La consulta debe usar p.area_trabajo_id en lugar de e.area_trabajo_id');
        } else {
            console.log('⚠️  No se encontraron entregables incluso con la consulta corregida');
        }

    } catch (error) {
        console.error('❌ Error en el diagnóstico:', error);
    } finally {
        await pool.end();
    }
}

testFixEntregablesMethod();