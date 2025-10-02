const { pool } = require('./src/config/database');

async function debugDeliverablesIssue() {
    try {
        console.log('=== DIAGNÓSTICO COMPLETO DEL PROBLEMA DE ENTREGABLES ===\n');
        
        // 1. Verificar usuario s@test.com
        console.log('1. INFORMACIÓN DEL USUARIO s@test.com:');
        const [users] = await pool.execute(`
            SELECT id, email, nombres, apellidos, rol_id, activo 
            FROM usuarios WHERE email = 's@test.com'
        `);
        
        if (users.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const user = users[0];
        console.log(`✅ Usuario: ${user.email} (ID: ${user.id}, Rol: ${user.rol_id}, Activo: ${user.activo})\n`);
        
        // 2. Verificar entregables usando el método exacto del modelo
        console.log('2. ENTREGABLES SEGÚN EL MÉTODO findByStudent:');
        const [deliverables] = await pool.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                p.estado as proyecto_estado,
                p.estudiante_id as proyecto_estudiante_id,
                fp.nombre as fase_nombre,
                fp.descripcion as fase_descripcion,
                at.codigo as area_trabajo_codigo,
                pu.usuario_id as miembro_usuario_id,
                pu.estado as miembro_estado
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            ORDER BY e.fecha_entrega ASC
        `, [user.id]);
        
        console.log(`📋 Total de entregables encontrados: ${deliverables.length}`);
        
        if (deliverables.length > 0) {
            deliverables.forEach((d, index) => {
                console.log(`\n${index + 1}. Entregable: "${d.titulo}"`);
                console.log(`   - ID: ${d.id}`);
                console.log(`   - Proyecto: "${d.proyecto_titulo}" (ID: ${d.proyecto_id})`);
                console.log(`   - Estudiante del proyecto: ${d.proyecto_estudiante_id}`);
                console.log(`   - Estado: ${d.estado}`);
                console.log(`   - Fecha entrega: ${d.fecha_entrega}`);
                console.log(`   - Miembro activo: ${d.miembro_usuario_id} (estado: ${d.miembro_estado})`);
            });
        }
        
        // 3. Verificar TODOS los entregables en la base de datos
        console.log('\n\n3. TODOS LOS ENTREGABLES EN LA BASE DE DATOS:');
        const [allDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.email as estudiante_email
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            ORDER BY e.created_at DESC
            LIMIT 10
        `);
        
        console.log(`📋 Últimos 10 entregables en la base de datos:`);
        allDeliverables.forEach((d, index) => {
            console.log(`${index + 1}. "${d.titulo}" - Proyecto: "${d.proyecto_titulo}" - Estudiante: ${d.estudiante_email} (ID: ${d.estudiante_id})`);
        });
        
        // 4. Verificar proyectos del usuario
        console.log('\n\n4. PROYECTOS DEL USUARIO s@test.com:');
        const [userProjects] = await pool.execute(`
            SELECT DISTINCT
                p.id,
                p.titulo,
                p.estudiante_id,
                pu.usuario_id,
                pu.estado as miembro_estado,
                u.email as estudiante_principal
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
        `, [user.id]);
        
        console.log(`📁 Proyectos donde ${user.email} es miembro activo: ${userProjects.length}`);
        userProjects.forEach((p, index) => {
            console.log(`${index + 1}. "${p.titulo}" (ID: ${p.id})`);
            console.log(`   - Estudiante principal: ${p.estudiante_principal} (ID: ${p.estudiante_id})`);
            console.log(`   - ${user.email} es miembro con estado: ${p.miembro_estado}`);
        });
        
        // 5. Verificar entregables que NO deberían ver
        console.log('\n\n5. ENTREGABLES QUE NO DEBERÍA VER s@test.com:');
        const [shouldNotSee] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.email as estudiante_email
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.id NOT IN (
                SELECT DISTINCT proyecto_id 
                FROM proyecto_usuarios 
                WHERE usuario_id = ? AND estado = 'activo'
            )
            ORDER BY e.created_at DESC
            LIMIT 5
        `, [user.id]);
        
        console.log(`🚫 Entregables que NO debería ver: ${shouldNotSee.length}`);
        shouldNotSee.forEach((d, index) => {
            console.log(`${index + 1}. "${d.titulo}" - Proyecto: "${d.proyecto_titulo}" - Estudiante: ${d.estudiante_email}`);
        });
        
        // 6. Verificar si hay problemas de membresía en proyectos
        console.log('\n\n6. VERIFICACIÓN DE MEMBRESÍAS EN PROYECTOS:');
        const [memberships] = await pool.execute(`
            SELECT 
                p.titulo as proyecto,
                p.estudiante_id,
                u1.email as estudiante_principal,
                pu.usuario_id as miembro_id,
                u2.email as miembro_email,
                pu.estado as miembro_estado
            FROM proyectos p
            LEFT JOIN usuarios u1 ON p.estudiante_id = u1.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u2 ON pu.usuario_id = u2.id
            WHERE p.id IN (
                SELECT DISTINCT proyecto_id 
                FROM proyecto_usuarios 
                WHERE usuario_id = ? AND estado = 'activo'
            )
            ORDER BY p.titulo, pu.usuario_id
        `, [user.id]);
        
        console.log(`👥 Membresías en proyectos de ${user.email}:`);
        let currentProject = '';
        memberships.forEach((m) => {
            if (m.proyecto !== currentProject) {
                console.log(`\n📁 Proyecto: "${m.proyecto}"`);
                console.log(`   Estudiante principal: ${m.estudiante_principal} (ID: ${m.estudiante_id})`);
                console.log(`   Miembros:`);
                currentProject = m.proyecto;
            }
            console.log(`   - ${m.miembro_email} (ID: ${m.miembro_id}) - Estado: ${m.miembro_estado}`);
        });
        
        // 7. Recomendaciones
        console.log('\n\n=== RECOMENDACIONES ===');
        console.log('1. Si el usuario ve entregables que no debería ver:');
        console.log('   - Verificar caché del navegador (Ctrl+F5 o modo incógnito)');
        console.log('   - Verificar que no haya sesiones múltiples abiertas');
        console.log('   - Verificar que la sesión sea correcta');
        
        console.log('\n2. Si los datos aquí son correctos pero el usuario ve otros:');
        console.log('   - El problema está en el frontend/caché');
        console.log('   - Recomendar limpiar caché o usar otro navegador');
        
        console.log('\n3. Si hay entregables incorrectos en esta consulta:');
        console.log('   - El problema está en la lógica de filtrado del modelo');
        console.log('   - Revisar membresías de proyectos');
        
    } catch (error) {
        console.error('❌ Error en el diagnóstico:', error);
    } finally {
        process.exit(0);
    }
}

debugDeliverablesIssue();