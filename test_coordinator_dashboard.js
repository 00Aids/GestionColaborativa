const { executeQuery } = require('./src/config/database');

async function testCoordinatorDashboard() {
    try {
        console.log('🧪 PROBANDO DASHBOARD DEL COORDINADOR\n');
        
        // 1. Buscar al usuario juan florez valderrama
        console.log('👤 1. BUSCANDO USUARIO JUAN FLOREZ VALDERRAMA:');
        const users = await executeQuery(`
            SELECT u.id, CONCAT(u.nombres, ' ', u.apellidos) as nombre_completo, u.email, u.rol_id, r.nombre as rol_actual
            FROM usuarios u
            LEFT JOIN roles r ON u.rol_id = r.id
            WHERE (u.nombres LIKE '%juan%' OR u.apellidos LIKE '%florez%' OR u.apellidos LIKE '%valderrama%') 
            OR u.email LIKE '%juan%'
        `);
        
        if (users.length === 0) {
            console.log('❌ No se encontró el usuario juan florez valderrama');
            return;
        }
        
        const targetUser = users[0];
        console.log(`✅ Usuario encontrado: ${targetUser.nombre_completo} (ID: ${targetUser.id})`);
        console.log(`   Email: ${targetUser.email}`);
        console.log(`   Rol: ${targetUser.rol_actual}`);
        
        // 2. Probar la consulta exacta del método getProjectsByCoordinator
        console.log('\n📁 2. PROBANDO CONSULTA getProjectsByCoordinator:');
        const coordinatorProjects = await executeQuery(`
            SELECT 
                p.*,
                u.nombres as estudiante_nombres,
                u.apellidos as estudiante_apellidos,
                u.email as estudiante_email,
                director.nombres as director_nombres,
                director.apellidos as director_apellidos,
                evaluador.nombres as evaluador_nombres,
                evaluador.apellidos as evaluador_apellidos,
                COUNT(d.id) as total_entregables,
                COUNT(CASE WHEN d.estado = 'completado' THEN 1 END) as entregables_completados
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            LEFT JOIN usuarios director ON p.director_id = director.id
            LEFT JOIN usuarios evaluador ON p.evaluador_id = evaluador.id
            LEFT JOIN entregables d ON p.id = d.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `, [targetUser.id]);
        
        console.log(`   Proyectos encontrados: ${coordinatorProjects.length}`);
        
        if (coordinatorProjects.length === 0) {
            console.log('❌ No se encontraron proyectos para el coordinador');
            
            // Verificar si existe en proyecto_usuarios
            console.log('\n🔍 3. VERIFICANDO TABLA proyecto_usuarios:');
            const projectUsers = await executeQuery(`
                SELECT pu.*, p.titulo as proyecto_titulo
                FROM proyecto_usuarios pu
                LEFT JOIN proyectos p ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = ?
            `, [targetUser.id]);
            
            console.log(`   Registros en proyecto_usuarios: ${projectUsers.length}`);
            projectUsers.forEach(pu => {
                console.log(`   - Proyecto: ${pu.proyecto_titulo || 'Sin título'} (ID: ${pu.proyecto_id}), Rol: ${pu.rol}, Estado: ${pu.estado}`);
            });
            
        } else {
            console.log('✅ Proyectos encontrados:');
            coordinatorProjects.forEach(project => {
                console.log(`   - ${project.titulo} (ID: ${project.id})`);
                console.log(`     Estado: ${project.estado}`);
                console.log(`     Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos}`);
                console.log(`     Entregables: ${project.total_entregables} (${project.entregables_completados} completados)`);
                console.log('');
            });
        }
        
        // 3. Simular el dashboard completo
        console.log('\n📊 4. SIMULANDO DASHBOARD COMPLETO:');
        
        // Calcular estadísticas como lo hace el dashboard
        const projectStatsRaw = coordinatorProjects.reduce((stats, project) => {
            const existingStat = stats.find(s => s.estado === project.estado);
            if (existingStat) {
                existingStat.cantidad++;
            } else {
                stats.push({ estado: project.estado, cantidad: 1 });
            }
            return stats;
        }, []);

        const projectStats = {
            total: projectStatsRaw.reduce((sum, stat) => sum + stat.cantidad, 0),
            activos: projectStatsRaw.filter(s => ['en_desarrollo', 'en_revision', 'aprobado'].includes(s.estado))
                .reduce((sum, stat) => sum + stat.cantidad, 0),
            completados: projectStatsRaw.filter(s => s.estado === 'finalizado')
                .reduce((sum, stat) => sum + stat.cantidad, 0)
        };
        
        console.log(`   📁 Proyectos Totales: ${projectStats.total}`);
        console.log(`   🟢 Proyectos Activos: ${projectStats.activos}`);
        console.log(`   ✅ Proyectos Completados: ${projectStats.completados}`);
        
        // Obtener entregables
        const deliverables = await executeQuery(`
            SELECT e.*, p.titulo as proyecto_titulo
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY e.fecha_entrega ASC
        `, [targetUser.id]);
        
        const deliverableStats = {
            total: deliverables.length,
            pendientes: deliverables.filter(d => d.estado === 'pendiente').length,
            vencidos: deliverables.filter(d => d.estado === 'vencido' || (new Date(d.fecha_entrega) < new Date() && d.estado !== 'completado')).length
        };
        
        console.log(`   📦 Entregables Totales: ${deliverableStats.total}`);
        console.log(`   ⏳ Entregables Pendientes: ${deliverableStats.pendientes}`);
        console.log(`   🔴 Entregables Vencidos: ${deliverableStats.vencidos}`);
        
        // Obtener estudiantes
        const students = await executeQuery(`
            SELECT DISTINCT u.id, u.nombres, u.apellidos
            FROM usuarios u
            INNER JOIN proyectos p ON u.id = p.estudiante_id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [targetUser.id]);
        
        console.log(`   👥 Estudiantes bajo supervisión: ${students.length}`);
        
        // 5. Verificar si el problema está en la vista o en los datos
        console.log('\n🔍 5. DIAGNÓSTICO FINAL:');
        
        if (coordinatorProjects.length > 0) {
            console.log('✅ Los datos están correctos en la base de datos');
            console.log('✅ El coordinador tiene proyectos asignados');
            console.log('✅ Las consultas SQL funcionan correctamente');
            console.log('');
            console.log('💡 POSIBLES CAUSAS DEL PROBLEMA:');
            console.log('   1. Problema en la sesión del usuario');
            console.log('   2. Error en el renderizado de la vista');
            console.log('   3. Problema en el middleware de autenticación');
            console.log('   4. Cache del navegador');
        } else {
            console.log('❌ El coordinador no tiene proyectos asignados');
            console.log('');
            console.log('💡 SOLUCIONES RECOMENDADAS:');
            console.log('   1. Verificar que el coordinador esté en la tabla proyecto_usuarios');
            console.log('   2. Asignar el coordinador a un proyecto existente');
            console.log('   3. Crear un proyecto de prueba para el coordinador');
        }
        
    } catch (error) {
        console.error('❌ Error durante la prueba:', error.message);
        console.error('Stack trace:', error.stack);
    }
}

console.log('🚀 Iniciando prueba del dashboard del coordinador...\n');
testCoordinatorDashboard();