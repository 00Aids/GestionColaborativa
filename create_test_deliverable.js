const { pool } = require('./src/config/database');

async function createTestDeliverable() {
    try {
        console.log('=== Creando Entregable de Prueba ===');
        
        // 1. Verificar estructura de la tabla entregables
        console.log('\n1. Verificando estructura de la tabla entregables...');
        const [columns] = await pool.execute(`DESCRIBE entregables`);
        console.log('Columnas de la tabla entregables:');
        columns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'NO' ? '(NOT NULL)' : '(NULL)'} ${col.Default ? `DEFAULT ${col.Default}` : ''}`);
        });
        
        // 2. Verificar fases disponibles
        console.log('\n2. Verificando fases disponibles...');
        const [phases] = await pool.execute(`SELECT * FROM fases_proyecto LIMIT 5`);
        console.log(`Fases encontradas: ${phases.length}`);
        phases.forEach(phase => {
            console.log(`  - ID: ${phase.id}, Nombre: ${phase.nombre}`);
        });
        
        // 3. Verificar proyectos disponibles
        console.log('\n3. Verificando proyectos disponibles...');
        const [projects] = await pool.execute(`SELECT * FROM proyectos LIMIT 5`);
        console.log(`Proyectos encontrados: ${projects.length}`);
        projects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Estudiante ID: ${project.estudiante_id}`);
        });
        
        // 4. Asignar estudiante s@test.com (ID: 62) al primer proyecto
        if (projects.length > 0) {
            const firstProject = projects[0];
            console.log(`\n4. Asignando estudiante s@test.com al proyecto "${firstProject.titulo}"...`);
            
            await pool.execute(`
                UPDATE proyectos SET estudiante_id = 62 WHERE id = ?
            `, [firstProject.id]);
            
            console.log('✅ Estudiante asignado al proyecto');
            
            // 5. Crear entregable con fase_id
            if (phases.length > 0) {
                console.log('\n5. Creando entregable de prueba...');
                
                const [result] = await pool.execute(`
                    INSERT INTO entregables (
                        titulo, descripcion, proyecto_id, fase_id, fecha_entrega, fecha_limite, 
                        estado, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                `, [
                    'Entregable de Prueba para Estudiante',
                    'Este es un entregable de prueba para verificar que el estudiante s@test.com pueda ver sus entregables',
                    firstProject.id,
                    phases[0].id, // Usar la primera fase disponible
                    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 días desde ahora
                    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 días desde ahora
                    'pendiente'
                ]);
                
                console.log(`✅ Entregable creado con ID: ${result.insertId}`);
                
                // 6. Verificar que el entregable se creó correctamente
                console.log('\n6. Verificando entregable creado...');
                const [newDeliverable] = await pool.execute(`
                    SELECT 
                        e.*,
                        p.titulo as proyecto_titulo,
                        fp.nombre as fase_nombre
                    FROM entregables e
                    LEFT JOIN proyectos p ON e.proyecto_id = p.id
                    LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                    WHERE e.id = ?
                `, [result.insertId]);
                
                if (newDeliverable.length > 0) {
                    const deliverable = newDeliverable[0];
                    console.log('✅ Entregable verificado:');
                    console.log(`  - ID: ${deliverable.id}`);
                    console.log(`  - Título: ${deliverable.titulo}`);
                    console.log(`  - Proyecto: ${deliverable.proyecto_titulo}`);
                    console.log(`  - Fase: ${deliverable.fase_nombre}`);
                    console.log(`  - Estado: ${deliverable.estado}`);
                    console.log(`  - Fecha límite: ${deliverable.fecha_limite}`);
                }
            }
        }
        
        // 7. Verificar entregables del estudiante
        console.log('\n7. Verificando entregables del estudiante s@test.com...');
        const [studentDeliverables] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                fp.nombre as fase_nombre
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            WHERE p.estudiante_id = 62
        `);
        
        console.log(`📋 Entregables del estudiante: ${studentDeliverables.length}`);
        studentDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

createTestDeliverable();