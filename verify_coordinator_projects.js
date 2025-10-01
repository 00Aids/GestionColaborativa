const { pool } = require('./src/config/database');

async function verifyCoordinatorProjects() {
    try {
        console.log('🔍 Verificando proyectos asignados al coordinador ananim@gmail.com...\n');
        
        // Obtener información del coordinador
        const [coordinatorRows] = await pool.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, u.rol_id, r.nombre as rol_nombre, u.area_trabajo_id 
            FROM usuarios u 
            LEFT JOIN roles r ON u.rol_id = r.id 
            WHERE u.email = ?
        `, ['ananim@gmail.com']);
        
        if (coordinatorRows.length === 0) {
            console.log('❌ Coordinador no encontrado');
            return;
        }
        
        const coordinator = coordinatorRows[0];
        console.log('👤 Coordinador encontrado:');
        console.log(`   ID: ${coordinator.id}`);
        console.log(`   Nombre: ${coordinator.nombres} ${coordinator.apellidos}`);
        console.log(`   Email: ${coordinator.email}`);
        console.log(`   Rol: ${coordinator.rol_nombre} (ID: ${coordinator.rol_id})`);
        console.log(`   Área de trabajo ID: ${coordinator.area_trabajo_id || 'null'}`);
        
        // Buscar proyectos donde el coordinador está asignado directamente
        console.log('\n📁 Proyectos donde está asignado directamente:');
        const [directProjectsRows] = await pool.execute(`
            SELECT p.id, p.titulo, p.estado, p.created_at,
                   pu.rol as rol_en_proyecto,
                   u_estudiante.nombres as estudiante_nombres, u_estudiante.apellidos as estudiante_apellidos,
                   u_director.nombres as director_nombres, u_director.apellidos as director_apellidos
            FROM proyectos p
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u_estudiante ON p.estudiante_id = u_estudiante.id
            LEFT JOIN usuarios u_director ON p.director_id = u_director.id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            ORDER BY p.created_at DESC
        `, [coordinator.id]);
        
        if (directProjectsRows.length > 0) {
            directProjectsRows.forEach(project => {
                console.log(`   - ${project.titulo} (${project.estado})`);
                console.log(`     ID: ${project.id}`);
                console.log(`     Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos}`);
                console.log(`     Director: ${project.director_nombres} ${project.director_apellidos}`);
                console.log(`     Creado: ${project.created_at}`);
                console.log('');
            });
        } else {
            console.log('   ❌ No hay proyectos asignados directamente');
        }
        
        // Buscar proyectos por área de trabajo (si tiene área asignada)
        if (coordinator.area_trabajo_id) {
            console.log('\n📁 Proyectos por área de trabajo:');
            const [areaProjectsRows] = await pool.execute(`
                SELECT p.id, p.titulo, p.estado, p.area_trabajo_id,
                       u_estudiante.nombres as estudiante_nombres, u_estudiante.apellidos as estudiante_apellidos
                FROM proyectos p
                LEFT JOIN usuarios u_estudiante ON p.estudiante_id = u_estudiante.id
                WHERE p.area_trabajo_id = ?
                ORDER BY p.created_at DESC
            `, [coordinator.area_trabajo_id]);
            
            if (areaProjectsRows.length > 0) {
                areaProjectsRows.forEach(project => {
                    console.log(`   - ${project.titulo} (${project.estado})`);
                    console.log(`     ID: ${project.id}`);
                    console.log(`     Estudiante: ${project.estudiante_nombres} ${project.estudiante_apellidos}`);
                    console.log('');
                });
            } else {
                console.log('   ❌ No hay proyectos en el área de trabajo');
            }
        } else {
            console.log('\n📁 No tiene área de trabajo asignada, no se filtran proyectos por área');
        }
        
        // Verificar entregables de los proyectos asignados directamente
        if (directProjectsRows.length > 0) {
            console.log('\n📦 Entregables de proyectos asignados directamente:');
            for (const project of directProjectsRows) {
                const [deliverablesRows] = await pool.execute(`
                    SELECT id, titulo, descripcion, fecha_limite, estado
                    FROM entregables
                    WHERE proyecto_id = ?
                    ORDER BY fecha_limite ASC
                `, [project.id]);
                
                console.log(`\n   Proyecto: ${project.titulo}`);
                if (deliverablesRows.length > 0) {
                    deliverablesRows.forEach(deliverable => {
                        console.log(`     - ${deliverable.titulo} (${deliverable.estado})`);
                        console.log(`       Fecha límite: ${deliverable.fecha_limite}`);
                    });
                } else {
                    console.log('     ❌ No hay entregables');
                }
            }
        }
        
        // Verificar todos los proyectos en el sistema para comparar
        console.log('\n📊 Resumen de todos los proyectos en el sistema:');
        const [allProjectsRows] = await pool.execute(`
            SELECT COUNT(*) as total_proyectos,
                   SUM(CASE WHEN estado IN ('en_desarrollo', 'en_revision', 'aprobado') THEN 1 ELSE 0 END) as activos,
                   SUM(CASE WHEN estado = 'finalizado' THEN 1 ELSE 0 END) as completados
            FROM proyectos
        `);
        
        console.log(`   Total de proyectos en el sistema: ${allProjectsRows[0].total_proyectos}`);
        console.log(`   Proyectos activos: ${allProjectsRows[0].activos}`);
        console.log(`   Proyectos completados: ${allProjectsRows[0].completados}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

verifyCoordinatorProjects();