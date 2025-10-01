const { pool } = require('./src/config/database');
const Entregable = require('./src/models/Entregable');

async function testFinalEntregablesFix() {
    try {
        console.log('🧪 PROBANDO CORRECCIÓN FINAL DE ENTREGABLES');
        console.log('='.repeat(60));

        // 1. Verificar coordinador actualizado
        console.log('\n📋 1. VERIFICANDO COORDINADOR ACTUALIZADO:');
        const [coordinator] = await pool.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.area_trabajo_id, at.nombre as area_nombre
            FROM usuarios u
            LEFT JOIN areas_trabajo at ON u.area_trabajo_id = at.id
            WHERE u.email = 'ananim@gmail.com'
        `);

        if (coordinator.length === 0) {
            console.log('❌ Coordinador no encontrado');
            return;
        }

        const coord = coordinator[0];
        console.log(`✅ Coordinador: ${coord.nombres} ${coord.apellidos}`);
        console.log(`   Email: ${coord.email}`);
        console.log(`   Área ID: ${coord.area_trabajo_id}`);
        console.log(`   Área nombre: ${coord.area_nombre}`);

        // 2. Probar el método findByAreaForReview corregido
        console.log('\n📋 2. PROBANDO MÉTODO findByAreaForReview CORREGIDO:');
        const entregableModel = new Entregable();
        const deliverables = await entregableModel.findByAreaForReview(coord.area_trabajo_id);

        console.log(`📊 Entregables encontrados: ${deliverables.length}`);
        
        if (deliverables.length > 0) {
            console.log('\n✅ ENTREGABLES PARA REVISIÓN:');
            deliverables.forEach((entregable, index) => {
                console.log(`   ${index + 1}. ${entregable.titulo}`);
                console.log(`      Estado: ${entregable.estado}`);
                console.log(`      Proyecto: ${entregable.proyecto_titulo}`);
                console.log(`      Estudiante: ${entregable.estudiante_nombres || 'Sin asignar'} ${entregable.estudiante_apellidos || ''}`);
                console.log(`      Fecha límite: ${entregable.fecha_limite}`);
                console.log(`      Fecha entrega: ${entregable.fecha_entrega || 'No entregado'}`);
                console.log('');
            });
        } else {
            console.log('⚠️  No se encontraron entregables para revisión');
        }

        // 3. Probar el método getWorkflowSummary
        console.log('\n📋 3. PROBANDO ESTADÍSTICAS DE ENTREGABLES:');
        try {
            const areaStats = await entregableModel.getWorkflowSummary(coord.area_trabajo_id);
            console.log('✅ Estadísticas obtenidas:');
            console.log(`   Nuevos: ${areaStats.nuevos || 0}`);
            console.log(`   En revisión: ${areaStats.en_revision || 0}`);
            console.log(`   Requieren cambios: ${areaStats.requiere_cambios || 0}`);
            console.log(`   Aprobados hoy: ${areaStats.aprobados_hoy || 0}`);
        } catch (error) {
            console.log(`⚠️  Error obteniendo estadísticas: ${error.message}`);
        }

        // 4. Simular la consulta del controlador EntregableController
        console.log('\n📋 4. SIMULANDO CONTROLADOR EntregableController:');
        
        // Organizar entregables por estado como lo hace el controlador
        const deliverablesByStatus = {
            entregado: deliverables.filter(d => d.estado === 'entregado'),
            en_revision: deliverables.filter(d => d.estado === 'en_revision'),
            requiere_cambios: deliverables.filter(d => d.estado === 'requiere_cambios'),
            pendiente: deliverables.filter(d => d.estado === 'pendiente')
        };

        console.log('📊 Entregables por estado:');
        console.log(`   Entregados: ${deliverablesByStatus.entregado.length}`);
        console.log(`   En revisión: ${deliverablesByStatus.en_revision.length}`);
        console.log(`   Requieren cambios: ${deliverablesByStatus.requiere_cambios.length}`);
        console.log(`   Pendientes: ${deliverablesByStatus.pendiente.length}`);

        // 5. Verificar que el entregable tiene el estado correcto para aparecer en la interfaz
        console.log('\n📋 5. VERIFICANDO ESTADOS PARA INTERFAZ:');
        const validStates = ['entregado', 'en_revision', 'requiere_cambios', 'pendiente'];
        const validDeliverables = deliverables.filter(d => validStates.includes(d.estado));
        
        console.log(`📊 Entregables válidos para mostrar en interfaz: ${validDeliverables.length}`);
        validDeliverables.forEach(d => {
            console.log(`   - ${d.titulo} (${d.estado}) - Debería aparecer en la interfaz`);
        });

        console.log('\n✅ PRUEBA COMPLETADA');
        console.log('='.repeat(60));
        
        if (deliverables.length > 0) {
            console.log('🎉 ¡ÉXITO! El coordinador ahora debería ver entregables en la interfaz');
            console.log('💡 Refresca la página en /coordinator/deliverables para ver los cambios');
        } else {
            console.log('⚠️  Aún no hay entregables para mostrar');
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    } finally {
        await pool.end();
    }
}

testFinalEntregablesFix();