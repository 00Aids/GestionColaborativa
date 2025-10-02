const { pool } = require('./src/config/database');

async function checkProjectsAndAssign() {
    try {
        console.log('=== Verificando Proyectos y Asignaciones ===');
        
        // 1. Verificar proyectos existentes
        console.log('\n1. Proyectos existentes en el sistema:');
        const [projects] = await pool.execute(`
            SELECT p.*, u.nombres, u.apellidos, u.email 
            FROM proyectos p 
            LEFT JOIN usuarios u ON p.estudiante_id = u.id 
            ORDER BY p.id DESC 
            LIMIT 10
        `);
        
        console.log(`📁 Total de proyectos: ${projects.length}`);
        projects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Estudiante: ${project.nombres || 'Sin asignar'} ${project.apellidos || ''} (${project.email || 'N/A'})`);
        });
        
        // 2. Verificar si hay proyectos sin estudiante asignado
        console.log('\n2. Proyectos sin estudiante asignado:');
        const [unassignedProjects] = await pool.execute(`
            SELECT * FROM proyectos WHERE estudiante_id IS NULL OR estudiante_id = 0
        `);
        
        console.log(`📁 Proyectos sin asignar: ${unassignedProjects.length}`);
        unassignedProjects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}`);
        });
        
        // 3. Verificar entregables existentes
        console.log('\n3. Entregables existentes (últimos 10):');
        const [deliverables] = await pool.execute(`
            SELECT e.*, p.titulo as proyecto_titulo, u.nombres, u.apellidos 
            FROM entregables e 
            LEFT JOIN proyectos p ON e.proyecto_id = p.id 
            LEFT JOIN usuarios u ON p.estudiante_id = u.id 
            ORDER BY e.id DESC 
            LIMIT 10
        `);
        
        deliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}, Estudiante: ${deliverable.nombres || 'Sin asignar'} ${deliverable.apellidos || ''}`);
        });
        
        // 4. Opción: Asignar estudiante s@test.com a un proyecto existente
        if (unassignedProjects.length > 0) {
            console.log('\n4. Asignando estudiante s@test.com al primer proyecto sin asignar...');
            const projectToAssign = unassignedProjects[0];
            
            await pool.execute(`
                UPDATE proyectos SET estudiante_id = 62 WHERE id = ?
            `, [projectToAssign.id]);
            
            console.log(`✅ Estudiante asignado al proyecto "${projectToAssign.titulo}" (ID: ${projectToAssign.id})`);
            
            // Verificar entregables de este proyecto
            const [projectDeliverables] = await pool.execute(`
                SELECT * FROM entregables WHERE proyecto_id = ?
            `, [projectToAssign.id]);
            
            console.log(`📋 Este proyecto tiene ${projectDeliverables.length} entregables`);
            
        } else if (projects.length > 0) {
            console.log('\n4. Creando un entregable de prueba para el primer proyecto...');
            const firstProject = projects[0];
            
            // Asignar el estudiante al primer proyecto si no está asignado
            if (!firstProject.estudiante_id) {
                await pool.execute(`
                    UPDATE proyectos SET estudiante_id = 62 WHERE id = ?
                `, [firstProject.id]);
                console.log(`✅ Estudiante asignado al proyecto "${firstProject.titulo}"`);
            }
            
            // Crear un entregable de prueba
            const [result] = await pool.execute(`
                INSERT INTO entregables (
                    titulo, descripcion, proyecto_id, fecha_entrega, fecha_limite, 
                    estado, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())
            `, [
                'Entregable de Prueba',
                'Este es un entregable de prueba para verificar la funcionalidad',
                firstProject.id,
                new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días desde ahora
                new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días desde ahora
                'pendiente'
            ]);
            
            console.log(`✅ Entregable de prueba creado con ID: ${result.insertId}`);
        }
        
        // 5. Verificar resultado final
        console.log('\n5. Verificación final - Entregables del estudiante s@test.com:');
        const [finalDeliverables] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = 62
        `);
        
        console.log(`📋 Entregables finales: ${finalDeliverables.length}`);
        finalDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkProjectsAndAssign();