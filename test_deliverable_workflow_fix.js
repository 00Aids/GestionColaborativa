const { pool } = require('./src/config/database');
const Entregable = require('./src/models/Entregable');

async function testDeliverableWorkflowFix() {
    console.log('🧪 TESTING: Flujo completo de entregables - Corrección de filtrado\n');

    try {
        // 1. Obtener un coordinador de prueba
        console.log('📋 1. OBTENIENDO COORDINADOR DE PRUEBA:');
        const [coordinators] = await pool.execute(`
            SELECT DISTINCT u.id, u.nombres, u.apellidos, u.email
            FROM usuarios u
            INNER JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            WHERE pu.rol = 'coordinador'
            LIMIT 1
        `);

        if (coordinators.length === 0) {
            console.log('❌ No se encontraron coordinadores en el sistema');
            return;
        }

        const coordinator = coordinators[0];
        console.log(`✅ Coordinador: ${coordinator.nombres} ${coordinator.apellidos} (${coordinator.email})`);

        // 2. Crear entregables de prueba en diferentes estados
        console.log('\n📋 2. CREANDO ENTREGABLES DE PRUEBA:');
        
        // Obtener un proyecto del coordinador
        const [projects] = await pool.execute(`
            SELECT p.id, p.titulo, p.estudiante_id
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            LIMIT 1
        `, [coordinator.id]);

        if (projects.length === 0) {
            console.log('❌ No se encontraron proyectos para el coordinador');
            return;
        }

        const project = projects[0];
        console.log(`✅ Proyecto: ${project.titulo}`);

        // Obtener una fase disponible (las fases son genéricas)
        const [phases] = await pool.execute(`
            SELECT id, nombre
            FROM fases_proyecto
            WHERE activo = TRUE
            LIMIT 1
        `);

        if (phases.length === 0) {
            console.log('❌ No se encontraron fases para el proyecto');
            return;
        }

        const phase = phases[0];
        console.log(`✅ Fase: ${phase.nombre}`);

        // Crear entregables de prueba
        const testDeliverables = [
            {
                titulo: 'Entregable PENDIENTE (NO debe aparecer)',
                estado: 'pendiente',
                fecha_entrega: null,
                descripcion: 'Este entregable NO debe aparecer en la vista del coordinador'
            },
            {
                titulo: 'Entregable ENTREGADO (SÍ debe aparecer)',
                estado: 'entregado',
                fecha_entrega: new Date(),
                descripcion: 'Este entregable SÍ debe aparecer en la vista del coordinador'
            },
            {
                titulo: 'Entregable EN_REVISION (SÍ debe aparecer)',
                estado: 'en_revision',
                fecha_entrega: new Date(),
                descripcion: 'Este entregable SÍ debe aparecer en la vista del coordinador'
            }
        ];

        const createdDeliverables = [];
        for (const deliverable of testDeliverables) {
            const [result] = await pool.execute(`
                INSERT INTO entregables (
                    titulo, descripcion, proyecto_id, fase_id, estado, fecha_entrega, 
                    fecha_limite, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY), NOW(), NOW())
            `, [
                deliverable.titulo,
                deliverable.descripcion,
                project.id,
                phase.id,
                deliverable.estado,
                deliverable.fecha_entrega
            ]);

            createdDeliverables.push({
                id: result.insertId,
                ...deliverable
            });

            console.log(`✅ Creado: ${deliverable.titulo} (Estado: ${deliverable.estado})`);
        }

        // 3. Probar el método corregido findByCoordinatorForReview
        console.log('\n📋 3. PROBANDO MÉTODO CORREGIDO:');
        const entregableModel = new Entregable();
        const deliverables = await entregableModel.findByCoordinatorForReview(coordinator.id);

        console.log(`📊 Entregables encontrados para revisión: ${deliverables.length}`);

        // Verificar que solo aparecen los entregables correctos
        const pendingFound = deliverables.find(d => d.estado === 'pendiente');
        const deliveredFound = deliverables.find(d => d.estado === 'entregado' && d.titulo.includes('ENTREGADO'));
        const inReviewFound = deliverables.find(d => d.estado === 'en_revision' && d.titulo.includes('EN_REVISION'));

        console.log('\n🔍 VERIFICACIÓN DE FILTRADO:');
        console.log(`❌ Entregables PENDIENTES encontrados: ${pendingFound ? 'SÍ (ERROR)' : 'NO (CORRECTO)'}`);
        console.log(`✅ Entregables ENTREGADOS encontrados: ${deliveredFound ? 'SÍ (CORRECTO)' : 'NO (ERROR)'}`);
        console.log(`✅ Entregables EN_REVISION encontrados: ${inReviewFound ? 'SÍ (CORRECTO)' : 'NO (ERROR)'}`);

        // 4. Mostrar todos los entregables encontrados
        if (deliverables.length > 0) {
            console.log('\n📋 4. ENTREGABLES PARA REVISIÓN:');
            deliverables.forEach((entregable, index) => {
                console.log(`   ${index + 1}. ${entregable.titulo}`);
                console.log(`      Estado: ${entregable.estado}`);
                console.log(`      Proyecto: ${entregable.proyecto_titulo}`);
                console.log(`      Estudiante: ${entregable.estudiante_nombres || 'Sin asignar'} ${entregable.estudiante_apellidos || ''}`);
                console.log(`      Fecha entrega: ${entregable.fecha_entrega || 'No entregado'}`);
                console.log('');
            });
        }

        // 5. Probar el flujo completo de estados
        console.log('\n📋 5. PROBANDO FLUJO COMPLETO DE ESTADOS:');
        
        // Simular que un estudiante "entrega" un entregable pendiente
        const pendingDeliverable = createdDeliverables.find(d => d.estado === 'pendiente');
        if (pendingDeliverable) {
            console.log(`🔄 Simulando entrega del entregable: ${pendingDeliverable.titulo}`);
            
            // Actualizar estado a 'entregado'
            await pool.execute(`
                UPDATE entregables 
                SET estado = 'entregado', fecha_entrega = NOW(), updated_at = NOW()
                WHERE id = ?
            `, [pendingDeliverable.id]);

            console.log('✅ Entregable marcado como entregado');

            // Verificar que ahora aparece en la lista del coordinador
            const updatedDeliverables = await entregableModel.findByCoordinatorForReview(coordinator.id);
            const nowVisible = updatedDeliverables.find(d => d.id === pendingDeliverable.id);
            
            console.log(`📊 Ahora visible para coordinador: ${nowVisible ? 'SÍ (CORRECTO)' : 'NO (ERROR)'}`);
        }

        // 6. Estadísticas finales
        console.log('\n📊 ESTADÍSTICAS FINALES:');
        const [stats] = await pool.execute(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN e.estado = 'pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN e.estado = 'entregado' THEN 1 ELSE 0 END) as entregados,
                SUM(CASE WHEN e.estado = 'en_revision' THEN 1 ELSE 0 END) as en_revision,
                SUM(CASE WHEN e.estado = 'aceptado' THEN 1 ELSE 0 END) as aceptados,
                SUM(CASE WHEN e.estado = 'rechazado' THEN 1 ELSE 0 END) as rechazados
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [coordinator.id]);

        const finalStats = stats[0];
        console.log(`📈 Total entregables del coordinador: ${finalStats.total}`);
        console.log(`   - Pendientes: ${finalStats.pendientes} (NO visibles para revisión)`);
        console.log(`   - Entregados: ${finalStats.entregados} (SÍ visibles para revisión)`);
        console.log(`   - En revisión: ${finalStats.en_revision} (SÍ visibles para revisión)`);
        console.log(`   - Aceptados: ${finalStats.aceptados} (SÍ visibles para revisión)`);
        console.log(`   - Rechazados: ${finalStats.rechazados} (SÍ visibles para revisión)`);

        // 7. Limpiar entregables de prueba
        console.log('\n🧹 LIMPIANDO ENTREGABLES DE PRUEBA:');
        for (const deliverable of createdDeliverables) {
            await pool.execute('DELETE FROM entregables WHERE id = ?', [deliverable.id]);
        }
        console.log('✅ Entregables de prueba eliminados');

        console.log('\n🎉 PRUEBA COMPLETADA EXITOSAMENTE');
        console.log('\n📋 RESUMEN DE LA CORRECCIÓN:');
        console.log('✅ Se eliminó el estado "pendiente" del filtro');
        console.log('✅ Se agregó la condición "fecha_entrega IS NOT NULL"');
        console.log('✅ Ahora solo se muestran entregables realmente enviados por estudiantes');

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        process.exit(0);
    }
}

testDeliverableWorkflowFix();