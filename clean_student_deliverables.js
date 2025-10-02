const { pool } = require('./src/config/database');

async function cleanStudentDeliverables() {
    try {
        console.log('=== Limpiando Entregables de s@test.com ===');
        
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
        
        // 2. Mostrar entregables actuales antes de eliminar
        console.log('\n2. Entregables actuales de s@test.com:');
        const [currentDeliverables] = await pool.execute(`
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
        
        console.log(`📋 Total entregables encontrados: ${currentDeliverables.length}`);
        currentDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
        if (currentDeliverables.length === 0) {
            console.log('✅ No hay entregables para eliminar');
            return;
        }
        
        // 3. Eliminar entregables relacionados con proyectos de s@test.com
        console.log('\n3. Eliminando entregables...');
        
        // Primero eliminamos los entregables
        const [deleteResult] = await pool.execute(`
            DELETE e FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = ?
        `, [studentId]);
        
        console.log(`✅ Eliminados ${deleteResult.affectedRows} entregables`);
        
        // 4. Opcional: También podemos limpiar los proyectos vacíos si quieres
        console.log('\n4. Verificando proyectos de s@test.com...');
        const [projects] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                COUNT(e.id) as num_entregables
            FROM proyectos p
            LEFT JOIN entregables e ON p.id = e.proyecto_id
            WHERE p.estudiante_id = ?
            GROUP BY p.id, p.titulo
        `, [studentId]);
        
        console.log(`📁 Proyectos del estudiante: ${projects.length}`);
        projects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Entregables restantes: ${project.num_entregables}`);
        });
        
        // 5. Verificar que no quedan entregables
        console.log('\n5. Verificación final...');
        const [remainingDeliverables] = await pool.execute(`
            SELECT COUNT(*) as count
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = ?
        `, [studentId]);
        
        const remainingCount = remainingDeliverables[0].count;
        if (remainingCount === 0) {
            console.log('✅ Limpieza completada exitosamente. No quedan entregables para s@test.com');
        } else {
            console.log(`⚠️ Aún quedan ${remainingCount} entregables. Puede que haya un problema.`);
        }
        
        console.log('\n🎯 Ahora puedes crear nuevos entregables para s@test.com y verificar que todo funciona correctamente.');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

cleanStudentDeliverables();