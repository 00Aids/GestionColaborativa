const { pool } = require('./src/config/database');

async function reassignDeliverables() {
    try {
        console.log('=== Reasignando Entregables a s@test.com ===');
        
        // 1. Obtener ID del usuario s@test.com
        const [users] = await pool.execute(`
            SELECT id FROM usuarios WHERE email = 's@test.com'
        `);
        
        if (users.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const studentId = users[0].id;
        console.log(`✅ Usuario s@test.com encontrado con ID: ${studentId}`);
        
        // 2. Buscar los entregables específicos que mencionaste
        const deliverableTitles = [
            'mediaaaaaaaaaaaaaaaaaaaaa',
            'wwww',
            'tarea media prioridad',
            'tarea baja prioridad'
        ];
        
        console.log('\n2. Buscando entregables específicos...');
        
        for (const title of deliverableTitles) {
            const [found] = await pool.execute(`
                SELECT 
                    e.id,
                    e.titulo,
                    e.proyecto_id,
                    p.titulo as proyecto_titulo,
                    p.estudiante_id as proyecto_estudiante_id
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                WHERE e.titulo LIKE ?
            `, [`%${title}%`]);
            
            if (found.length > 0) {
                console.log(`🔍 Encontrado "${title}":`);
                for (const deliverable of found) {
                    console.log(`  - ID: ${deliverable.id}, Proyecto: ${deliverable.proyecto_titulo}`);
                    
                    // Reasignar el proyecto del entregable a s@test.com
                    await pool.execute(`
                        UPDATE proyectos SET estudiante_id = ? WHERE id = ?
                    `, [studentId, deliverable.proyecto_id]);
                    
                    console.log(`  ✅ Proyecto reasignado a s@test.com`);
                }
            } else {
                console.log(`❌ No encontrado: "${title}"`);
            }
        }
        
        // 3. Verificar los entregables de s@test.com después de la reasignación
        console.log('\n3. Verificando entregables de s@test.com después de la reasignación...');
        const [studentDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = ?
            ORDER BY e.id DESC
        `, [studentId]);
        
        console.log(`📋 Total entregables de s@test.com: ${studentDeliverables.length}`);
        studentDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
        console.log('\n✅ Reasignación completada. Ahora s@test.com debería ver todos sus entregables.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

reassignDeliverables();