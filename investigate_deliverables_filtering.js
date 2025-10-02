const { pool } = require('./src/config/database');
const Entregable = require('./src/models/Entregable');

async function investigateDeliverablesFiltering() {
    try {
        console.log('=== Investigando Problema de Filtrado de Entregables ===');
        
        // 1. Obtener información del usuario s@test.com
        const [users] = await pool.execute(`
            SELECT id, email, nombres, apellidos FROM usuarios WHERE email = 's@test.com'
        `);
        
        if (users.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const student = users[0];
        console.log(`✅ Usuario encontrado: ${student.email} (ID: ${student.id})`);
        
        // 2. Verificar entregables usando el modelo (como lo hace el controlador)
        console.log('\n2. Entregables usando modelo Entregable.findByStudent...');
        const entregableModel = new Entregable();
        const modelDeliverables = await entregableModel.findByStudent(student.id);
        
        console.log(`📋 Entregables del modelo: ${modelDeliverables.length}`);
        modelDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
        // 3. Verificar entregables con consulta directa (misma lógica del modelo)
        console.log('\n3. Entregables con consulta directa (misma lógica del modelo)...');
        const [directDeliverables] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                fp.nombre as fase_nombre,
                at.codigo as area_trabajo_codigo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
            WHERE p.estudiante_id = ?
            ORDER BY e.fecha_limite ASC, e.fecha_entrega ASC
        `, [student.id]);
        
        console.log(`📋 Entregables consulta directa: ${directDeliverables.length}`);
        directDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto: ${deliverable.proyecto_titulo}`);
        });
        
        // 4. Verificar todos los entregables en el sistema con información del estudiante
        console.log('\n4. Todos los entregables en el sistema con información del estudiante...');
        const [allDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.email as estudiante_email,
                u.nombres as estudiante_nombres
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            ORDER BY e.id DESC
            LIMIT 20
        `);
        
        console.log(`📋 Últimos 20 entregables en el sistema:`);
        allDeliverables.forEach(deliverable => {
            const isForStudent = deliverable.estudiante_id === student.id ? '✅' : '❌';
            console.log(`  ${isForStudent} ID: ${deliverable.id}, Título: ${deliverable.titulo}`);
            console.log(`      Proyecto: ${deliverable.proyecto_titulo}, Estudiante: ${deliverable.estudiante_email}`);
        });
        
        // 5. Verificar si hay entregables sin proyecto asociado
        console.log('\n5. Verificando entregables sin proyecto asociado...');
        const [orphanDeliverables] = await pool.execute(`
            SELECT e.id, e.titulo, e.proyecto_id
            FROM entregables e
            WHERE e.proyecto_id IS NULL OR e.proyecto_id NOT IN (SELECT id FROM proyectos)
        `);
        
        console.log(`📋 Entregables huérfanos (sin proyecto válido): ${orphanDeliverables.length}`);
        orphanDeliverables.forEach(deliverable => {
            console.log(`  - ID: ${deliverable.id}, Título: ${deliverable.titulo}, Proyecto ID: ${deliverable.proyecto_id}`);
        });
        
        // 6. Verificar proyectos del estudiante
        console.log('\n6. Proyectos del estudiante s@test.com...');
        const [studentProjects] = await pool.execute(`
            SELECT id, titulo, estudiante_id, estado
            FROM proyectos 
            WHERE estudiante_id = ?
        `, [student.id]);
        
        console.log(`📁 Proyectos del estudiante: ${studentProjects.length}`);
        studentProjects.forEach(project => {
            console.log(`  - ID: ${project.id}, Título: ${project.titulo}, Estado: ${project.estado}`);
        });
        
        // 7. Verificar si hay entregables que aparecen en la vista pero no deberían
        console.log('\n7. Verificando entregables específicos mencionados por el usuario...');
        const problematicTitles = ['tarea para c'];
        
        for (const title of problematicTitles) {
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
                console.log(`🔍 Entregable "${title}" encontrado:`);
                found.forEach(deliverable => {
                    console.log(`  - ID: ${deliverable.id}, Proyecto: ${deliverable.proyecto_titulo}`);
                    console.log(`    Estudiante asignado: ${deliverable.estudiante_email} (ID: ${deliverable.estudiante_id})`);
                    console.log(`    ¿Debería verlo s@test.com? ${deliverable.estudiante_id === student.id ? 'SÍ' : 'NO'}`);
                });
            } else {
                console.log(`❌ No se encontró entregable con título "${title}"`);
            }
        }
        
        // 8. Verificar si hay algún problema con la sesión o autenticación
        console.log('\n8. Verificando posibles problemas de sesión...');
        console.log('💡 Recomendaciones:');
        console.log('   1. Verificar que el usuario en sesión sea realmente s@test.com');
        console.log('   2. Verificar que no haya cache en el navegador');
        console.log('   3. Verificar que la consulta del controlador use el ID correcto');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

investigateDeliverablesFiltering();