const { pool } = require('./src/config/database');

async function investigateStudentDeliverables() {
    try {
        console.log('=== Investigando Entregables del Estudiante s@test.com ===');
        
        // 0. Verificar estructura de la tabla usuarios
        console.log('\n0. Verificando estructura de la tabla usuarios...');
        const [userColumns] = await pool.execute(`DESCRIBE usuarios`);
        console.log('Columnas de usuarios:');
        userColumns.forEach(col => {
            console.log(`  - ${col.Field}: ${col.Type}`);
        });
        
        // 1. Verificar el usuario s@test.com
        console.log('\n1. Verificando usuario s@test.com...');
        const [users] = await pool.execute(`
            SELECT * FROM usuarios WHERE email = 's@test.com'
        `);
        
        if (users.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const student = users[0];
        console.log(`✅ Usuario encontrado: ID ${student.id}, Email: ${student.email}`);
        
        // 2. Verificar proyectos del estudiante
        console.log('\n2. Verificando proyectos del estudiante...');
        const [projects] = await pool.execute(`
            SELECT id, titulo, estudiante_id FROM proyectos WHERE estudiante_id = ?
        `, [student.id]);
        
        console.log(`📁 Proyectos del estudiante: ${projects.length}`);
        projects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}`);
        });
        
        // 3. Verificar entregables con consulta directa
        console.log('\n3. Verificando entregables con consulta directa...');
        const [directDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.descripcion,
                e.estado,
                e.fecha_limite,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                fp.nombre as fase_nombre
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            WHERE p.estudiante_id = ?
            ORDER BY e.id DESC
        `, [student.id]);
        
        console.log(`📋 Entregables consulta directa: ${directDeliverables.length}`);
        directDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}, Estado: ${deliverable.estado}`);
        });
        
        // 4. Verificar todos los entregables que mencionaste
        console.log('\n4. Buscando entregables específicos que mencionaste...');
        const searchTitles = ['mediaaaaaaaaaaaaaaaaaaaaa', 'wwww', 'tarea media prioridad', 'tarea baja prioridad'];
        
        for (const title of searchTitles) {
            const [found] = await pool.execute(`
                SELECT 
                    e.id,
                    e.titulo,
                    e.proyecto_id,
                    p.titulo as proyecto_titulo,
                    p.estudiante_id,
                    u.email as estudiante_email
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                WHERE e.titulo LIKE ?
            `, [`%${title}%`]);
            
            if (found.length > 0) {
                console.log(`🔍 Encontrado "${title}":`);
                found.forEach(item => {
                    console.log(`    - ID: ${item.id}, Proyecto: ${item.proyecto_titulo}, Estudiante: ${item.estudiante_email} (ID: ${item.estudiante_id})`);
                });
            } else {
                console.log(`❌ No encontrado: "${title}"`);
            }
        }
        
        // 5. Verificar si hay problema con la asignación de proyectos
        console.log('\n5. Verificando todos los entregables del sistema...');
        const [allDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.email as estudiante_email
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            ORDER BY e.id DESC
            LIMIT 20
        `);
        
        console.log(`📋 Últimos 20 entregables del sistema:`);
        allDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Estudiante: ${deliverable.estudiante_email || 'Sin asignar'}`);
        });
        
        // 6. Verificar si s@test.com debería estar asignado a otro proyecto
        console.log('\n6. Verificando si s@test.com debería estar en otro proyecto...');
        const [projectsWithDeliverables] = await pool.execute(`
            SELECT DISTINCT 
                p.id,
                p.titulo,
                p.estudiante_id,
                u.email as estudiante_actual,
                COUNT(e.id) as num_entregables
            FROM proyectos p
            LEFT JOIN entregables e ON p.id = e.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            GROUP BY p.id, p.titulo, p.estudiante_id, u.email
            HAVING num_entregables > 0
            ORDER BY num_entregables DESC
        `);
        
        console.log(`📊 Proyectos con entregables:`);
        projectsWithDeliverables.forEach(project => {
            console.log(`  - Proyecto: ${project.titulo}, Estudiante: ${project.estudiante_actual || 'Sin asignar'}, Entregables: ${project.num_entregables}`);
        });
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

investigateStudentDeliverables();