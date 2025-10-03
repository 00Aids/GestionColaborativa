const { executeQuery } = require('./src/config/database');

async function testDashboardWithActiveCoordinator() {
    try {
        console.log('🎯 PROBANDO DASHBOARD CON COORDINADOR ACTIVO');
        console.log('='.repeat(50));
        
        // 1. Verificar coordinador activo
        console.log('\n👤 1. VERIFICANDO COORDINADOR ACTIVO:');
        const coordinator = await executeQuery(`
            SELECT u.*, pu.proyecto_id, pu.rol, pu.estado, p.titulo as proyecto_titulo
            FROM usuarios u
            JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            JOIN proyectos p ON pu.proyecto_id = p.id
            WHERE (LOWER(CONCAT(u.nombres, ' ', u.apellidos)) LIKE '%juan florez valderrama%'
                   OR u.email LIKE '%pruebagestion3@gmail.com%')
              AND pu.rol = 'coordinador'
              AND pu.estado = 'activo'
        `);
        
        if (coordinator.length === 0) {
            console.log('❌ No se encontró coordinador activo');
            return;
        }
        
        const coord = coordinator[0];
        console.log(`✅ Coordinador encontrado: ${coord.nombres} ${coord.apellidos}`);
        console.log(`   Email: ${coord.email}`);
        console.log(`   Proyecto: ${coord.proyecto_titulo} (ID: ${coord.proyecto_id})`);
        console.log(`   Estado: ${coord.estado}`);
        
        // 2. Ejecutar la consulta exacta del dashboard (getProjectsByCoordinator)
        console.log('\n📊 2. EJECUTANDO CONSULTA DEL DASHBOARD:');
        const dashboardQuery = `
            SELECT 
                p.id,
                p.titulo,
                p.descripcion,
                p.estado,
                p.fecha_propuesta,
                p.fecha_finalizacion,
                CONCAT(estudiante.nombres, ' ', estudiante.apellidos) as estudiante_nombres,
                estudiante.apellidos as estudiante_apellidos,
                CONCAT(director.nombres, ' ', director.apellidos) as director_nombres,
                COUNT(DISTINCT e.id) as total_entregables,
                COUNT(DISTINCT CASE WHEN e.estado = 'completado' THEN e.id END) as entregables_completados
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios estudiante ON p.estudiante_id = estudiante.id
            LEFT JOIN usuarios director ON p.director_id = director.id
            LEFT JOIN entregables e ON p.id = e.proyecto_id
            WHERE pu.usuario_id = ? 
              AND pu.rol = 'coordinador'
              AND pu.estado = 'activo'
            GROUP BY p.id, p.titulo, p.descripcion, p.estado, p.fecha_propuesta, p.fecha_finalizacion,
                     estudiante.nombres, estudiante.apellidos, director.nombres
            ORDER BY p.fecha_propuesta DESC
        `;
        
        const dashboardResults = await executeQuery(dashboardQuery, [coord.id]);
        
        console.log(`   Proyectos encontrados: ${dashboardResults.length}`);
        
        if (dashboardResults.length === 0) {
            console.log('❌ La consulta del dashboard no devolvió proyectos');
            
            // Debug: verificar paso a paso
            console.log('\n🔍 DEBUG - VERIFICANDO PASO A PASO:');
            
            // Verificar proyecto_usuarios
            const puCheck = await executeQuery(`
                SELECT * FROM proyecto_usuarios 
                WHERE usuario_id = ? AND rol = 'coordinador' AND estado = 'activo'
            `, [coord.id]);
            console.log(`   proyecto_usuarios activos: ${puCheck.length}`);
            
            // Verificar proyectos
            const projectCheck = await executeQuery(`
                SELECT p.* FROM proyectos p
                INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                WHERE pu.usuario_id = ? AND pu.rol = 'coordinador' AND pu.estado = 'activo'
            `, [coord.id]);
            console.log(`   proyectos vinculados: ${projectCheck.length}`);
            
        } else {
            console.log('✅ Proyectos encontrados en el dashboard:');
            dashboardResults.forEach((project, index) => {
                console.log(`\n   📁 Proyecto ${index + 1}:`);
                console.log(`      ID: ${project.id}`);
                console.log(`      Título: ${project.titulo}`);
                console.log(`      Estado: ${project.estado}`);
                console.log(`      Estudiante: ${project.estudiante_nombres}`);
                console.log(`      Director: ${project.director_nombres || 'No asignado'}`);
                console.log(`      Entregables: ${project.total_entregables} (${project.entregables_completados} completados)`);
                console.log(`      Fecha propuesta: ${project.fecha_propuesta}`);
                console.log(`      Fecha finalización: ${project.fecha_finalizacion}`);
            });
        }
        
        // 3. Simular estadísticas completas del dashboard
        console.log('\n📈 3. ESTADÍSTICAS DEL DASHBOARD:');
        
        // Total proyectos
        const totalProjects = dashboardResults.length;
        
        // Proyectos activos
        const activeProjects = dashboardResults.filter(p => p.estado === 'en_desarrollo' || p.estado === 'activo').length;
        
        // Proyectos completados
        const completedProjects = dashboardResults.filter(p => p.estado === 'completado').length;
        
        // Total entregables
        const totalDeliverables = dashboardResults.reduce((sum, p) => sum + (p.total_entregables || 0), 0);
        
        // Entregables completados
        const completedDeliverables = dashboardResults.reduce((sum, p) => sum + (p.entregables_completados || 0), 0);
        
        // Estudiantes bajo supervisión
        const studentsQuery = await executeQuery(`
            SELECT COUNT(DISTINCT p.estudiante_id) as total_students
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? 
              AND pu.rol = 'coordinador'
              AND pu.estado = 'activo'
              AND p.estudiante_id IS NOT NULL
        `, [coord.id]);
        
        const totalStudents = studentsQuery[0]?.total_students || 0;
        
        console.log(`   📊 Total proyectos: ${totalProjects}`);
        console.log(`   🟢 Proyectos activos: ${activeProjects}`);
        console.log(`   ✅ Proyectos completados: ${completedProjects}`);
        console.log(`   📋 Total entregables: ${totalDeliverables}`);
        console.log(`   ✅ Entregables completados: ${completedDeliverables}`);
        console.log(`   👥 Estudiantes bajo supervisión: ${totalStudents}`);
        
        // 4. Diagnóstico final
        console.log('\n🎯 4. DIAGNÓSTICO FINAL:');
        if (dashboardResults.length > 0) {
            console.log('✅ EL DASHBOARD DEBERÍA FUNCIONAR CORRECTAMENTE');
            console.log('   - El coordinador está activo');
            console.log('   - Los proyectos están asignados');
            console.log('   - La consulta SQL funciona');
            console.log('\n💡 Si el dashboard no muestra datos, el problema puede ser:');
            console.log('   1. Sesión del usuario no actualizada');
            console.log('   2. Cache del navegador');
            console.log('   3. Problema en el frontend/controlador');
            console.log('   4. Middleware de autenticación');
        } else {
            console.log('❌ HAY UN PROBLEMA CON LA CONSULTA DEL DASHBOARD');
            console.log('   - Revisar la lógica de la consulta SQL');
            console.log('   - Verificar las condiciones de filtrado');
        }
        
        console.log('\n✅ PRUEBA COMPLETADA');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('Stack:', error.stack);
    }
}

testDashboardWithActiveCoordinator();