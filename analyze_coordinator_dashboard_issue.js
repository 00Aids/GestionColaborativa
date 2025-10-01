const { pool } = require('./src/config/database');

async function analyzeCoordinatorDashboardIssue() {
    try {
        console.log('🔍 Analizando problema del dashboard del coordinador...\n');
        
        // Obtener información del coordinador ananim@gmail.com
        const [coordinatorData] = await pool.execute(
            'SELECT id, nombres, apellidos, email, area_trabajo_id FROM usuarios WHERE email = ?',
            ['ananim@gmail.com']
        );
        
        if (!coordinatorData.length) {
            console.log('❌ Coordinador no encontrado');
            return;
        }
        
        const coordinator = coordinatorData[0];
        console.log('👤 Coordinador:', coordinator.nombres, coordinator.apellidos);
        console.log('📧 Email:', coordinator.email);
        console.log('🏢 Área de trabajo ID:', coordinator.area_trabajo_id);
        
        // Verificar qué proyectos está obteniendo el método actual
        console.log('\n📁 ANÁLISIS DE PROYECTOS:');
        console.log('='.repeat(50));
        
        // 1. Proyectos por área de trabajo (método actual)
        if (coordinator.area_trabajo_id) {
            const [projectsByArea] = await pool.execute(`
                SELECT p.id, p.titulo, p.estado, p.area_trabajo_id,
                       u.nombres as estudiante_nombres, u.apellidos as estudiante_apellidos
                FROM proyectos p
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                WHERE p.area_trabajo_id = ?
                ORDER BY p.created_at DESC
            `, [coordinator.area_trabajo_id]);
            
            console.log(`\n🔍 Proyectos por área de trabajo (${coordinator.area_trabajo_id}):`);
            console.log(`   Total: ${projectsByArea.length}`);
            projectsByArea.forEach(p => {
                console.log(`   - ${p.titulo} (${p.estado}) - Estudiante: ${p.estudiante_nombres || 'Sin asignar'} ${p.estudiante_apellidos || ''}`);
            });
        }
        
        // 2. Proyectos donde el coordinador está asignado directamente
        const [projectsWithCoordinator] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, pu.rol,
                   u.nombres as estudiante_nombres, u.apellidos as estudiante_apellidos
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY p.created_at DESC
        `, [coordinator.id]);
        
        console.log(`\n🎯 Proyectos donde está asignado como coordinador:`);
        console.log(`   Total: ${projectsWithCoordinator.length}`);
        projectsWithCoordinator.forEach(p => {
            console.log(`   - ${p.titulo} (${p.estado}) - Rol: ${p.rol} - Estudiante: ${p.estudiante_nombres || 'Sin asignar'} ${p.estudiante_apellidos || ''}`);
        });
        
        // 3. Todos los proyectos (para comparar)
        const [allProjects] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, p.area_trabajo_id,
                   u.nombres as estudiante_nombres, u.apellidos as estudiante_apellidos
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            ORDER BY p.created_at DESC
        `);
        
        console.log(`\n📊 Todos los proyectos en el sistema:`);
        console.log(`   Total: ${allProjects.length}`);
        allProjects.slice(0, 5).forEach(p => {
            console.log(`   - ${p.titulo} (${p.estado}) - Área: ${p.area_trabajo_id || 'Sin área'} - Estudiante: ${p.estudiante_nombres || 'Sin asignar'} ${p.estudiante_apellidos || ''}`);
        });
        
        // ANÁLISIS DE ENTREGABLES
        console.log('\n📦 ANÁLISIS DE ENTREGABLES:');
        console.log('='.repeat(50));
        
        // 1. Entregables por área de trabajo (método actual)
        if (coordinator.area_trabajo_id) {
            const [deliverablesByArea] = await pool.execute(`
                SELECT e.id, e.titulo, e.estado, e.fecha_limite, e.area_trabajo_id,
                       p.titulo as proyecto_titulo
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                WHERE e.area_trabajo_id = ?
                ORDER BY e.fecha_limite ASC
            `, [coordinator.area_trabajo_id]);
            
            console.log(`\n🔍 Entregables por área de trabajo (${coordinator.area_trabajo_id}):`);
            console.log(`   Total: ${deliverablesByArea.length}`);
            deliverablesByArea.slice(0, 5).forEach(d => {
                console.log(`   - ${d.titulo} (${d.estado}) - Proyecto: ${d.proyecto_titulo} - Fecha: ${d.fecha_limite}`);
            });
        }
        
        // 2. Entregables de proyectos donde el coordinador está asignado
        const [deliverablesFromCoordinatorProjects] = await pool.execute(`
            SELECT e.id, e.titulo, e.estado, e.fecha_limite,
                   p.titulo as proyecto_titulo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.fecha_limite ASC
        `, [coordinator.id]);
        
        console.log(`\n🎯 Entregables de proyectos donde está asignado como coordinador:`);
        console.log(`   Total: ${deliverablesFromCoordinatorProjects.length}`);
        deliverablesFromCoordinatorProjects.slice(0, 5).forEach(d => {
            console.log(`   - ${d.titulo} (${d.estado}) - Proyecto: ${d.proyecto_titulo} - Fecha: ${d.fecha_limite}`);
        });
        
        // RECOMENDACIONES
        console.log('\n💡 RECOMENDACIONES:');
        console.log('='.repeat(50));
        
        if (projectsWithCoordinator.length === 0) {
            console.log('⚠️  El coordinador no está asignado a ningún proyecto específico');
            console.log('   Esto explica por qué ve proyectos de toda el área en lugar de solo los suyos');
        }
        
        if (coordinator.area_trabajo_id) {
            console.log('✅ El coordinador tiene área de trabajo asignada');
            console.log('   Pero el filtrado debería ser por asignación directa, no por área');
        }
        
        console.log('\n🔧 SOLUCIÓN PROPUESTA:');
        console.log('   1. Cambiar el filtrado para mostrar solo proyectos donde el coordinador está asignado');
        console.log('   2. Si no tiene proyectos asignados, mostrar mensaje apropiado');
        console.log('   3. Filtrar entregables solo de proyectos asignados al coordinador');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

analyzeCoordinatorDashboardIssue();