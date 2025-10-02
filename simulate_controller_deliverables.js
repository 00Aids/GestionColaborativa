const { pool } = require('./src/config/database');
const Entregable = require('./src/models/Entregable');

async function simulateControllerDeliverables() {
    try {
        console.log('=== Simulando Exactamente lo que hace el Controlador ===');
        
        // Simular el usuario en sesión (s@test.com)
        const [users] = await pool.execute(`
            SELECT id, email, nombres, apellidos, rol_id FROM usuarios WHERE email = 's@test.com'
        `);
        
        if (users.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const user = users[0];
        console.log(`✅ Usuario simulado en sesión: ${user.email} (ID: ${user.id}, Rol ID: ${user.rol_id})`);
        
        // Simular exactamente lo que hace el controlador studentDeliverables
        console.log('\n=== Simulando DashboardController.studentDeliverables ===');
        
        try {
            // Obtener entregables del estudiante (exactamente como en el controlador)
            const entregableModel = new Entregable();
            const myDeliverables = await entregableModel.findByStudent(user.id);
            
            console.log(`📋 Entregables obtenidos por el controlador: ${myDeliverables ? myDeliverables.length : 0}`);
            
            if (myDeliverables && myDeliverables.length > 0) {
                console.log('\n📝 Lista de entregables que vería el usuario:');
                myDeliverables.forEach((deliverable, index) => {
                    console.log(`${index + 1}. ID: ${deliverable.id}`);
                    console.log(`   Título: ${deliverable.titulo}`);
                    console.log(`   Proyecto: ${deliverable.proyecto_titulo}`);
                    console.log(`   Estado: ${deliverable.estado}`);
                    console.log(`   Fecha límite: ${deliverable.fecha_limite}`);
                    console.log('');
                });
            } else {
                console.log('❌ No se encontraron entregables para este estudiante');
            }
            
            // Verificar si hay algún entregable específico que no debería estar
            console.log('\n=== Verificando Entregables Específicos ===');
            
            // Buscar entregables que podrían estar mal asignados
            const [allRecentDeliverables] = await pool.execute(`
                SELECT 
                    e.id,
                    e.titulo,
                    e.proyecto_id,
                    p.titulo as proyecto_titulo,
                    p.estudiante_id,
                    u.email as estudiante_email,
                    u.nombres as estudiante_nombres
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                WHERE e.created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY)
                ORDER BY e.created_at DESC
            `);
            
            console.log(`📋 Entregables creados en las últimas 24 horas: ${allRecentDeliverables.length}`);
            
            allRecentDeliverables.forEach(deliverable => {
                const belongsToUser = deliverable.estudiante_id === user.id;
                const status = belongsToUser ? '✅ PERTENECE' : '❌ NO PERTENECE';
                
                console.log(`${status} - ID: ${deliverable.id}, Título: ${deliverable.titulo}`);
                console.log(`   Proyecto: ${deliverable.proyecto_titulo}`);
                console.log(`   Asignado a: ${deliverable.estudiante_email} (ID: ${deliverable.estudiante_id})`);
                console.log('');
            });
            
            // Verificar si el usuario tiene múltiples proyectos
            console.log('\n=== Verificando Proyectos del Usuario ===');
            const [userProjects] = await pool.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.estudiante_id,
                    p.estado,
                    COUNT(e.id) as total_entregables
                FROM proyectos p
                LEFT JOIN entregables e ON p.id = e.proyecto_id
                WHERE p.estudiante_id = ?
                GROUP BY p.id
            `, [user.id]);
            
            console.log(`📁 Proyectos del usuario: ${userProjects.length}`);
            userProjects.forEach(project => {
                console.log(`  - ID: ${project.id}, Título: ${project.titulo}`);
                console.log(`    Estado: ${project.estado}, Entregables: ${project.total_entregables}`);
            });
            
            // Verificar si hay proyectos compartidos o mal configurados
            console.log('\n=== Verificando Posibles Problemas de Configuración ===');
            
            // Buscar proyectos que podrían tener múltiples estudiantes
            const [sharedProjects] = await pool.execute(`
                SELECT 
                    p.id,
                    p.titulo,
                    p.estudiante_id,
                    u.email as estudiante_principal,
                    COUNT(pu.usuario_id) as miembros_adicionales
                FROM proyectos p
                LEFT JOIN usuarios u ON p.estudiante_id = u.id
                LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
                GROUP BY p.id
                HAVING miembros_adicionales > 0
            `);
            
            if (sharedProjects.length > 0) {
                console.log(`⚠️  Proyectos con miembros adicionales encontrados: ${sharedProjects.length}`);
                sharedProjects.forEach(project => {
                    console.log(`  - Proyecto: ${project.titulo} (ID: ${project.id})`);
                    console.log(`    Estudiante principal: ${project.estudiante_principal}`);
                    console.log(`    Miembros adicionales: ${project.miembros_adicionales}`);
                });
            } else {
                console.log('✅ No se encontraron proyectos con configuración compartida');
            }
            
        } catch (error) {
            console.error('❌ Error en simulación del controlador:', error);
        }
        
    } catch (error) {
        console.error('❌ Error general:', error);
    }
}

simulateControllerDeliverables();