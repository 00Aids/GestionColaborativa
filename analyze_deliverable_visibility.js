const { pool } = require('./src/config/database');

async function analyzeDeliverableVisibility() {
    try {
        console.log('=== ANÁLISIS DE VISIBILIDAD DE ENTREGABLES ===\n');
        
        // 1. Verificar usuario s@test.com
        const [users] = await pool.execute(`
            SELECT id, email, nombres, apellidos, rol_id 
            FROM usuarios WHERE email = 's@test.com'
        `);
        
        if (users.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const user = users[0];
        console.log(`✅ Usuario: ${user.email} (ID: ${user.id})\n`);
        
        // 2. OPCIÓN A: Solo entregables PROPIOS (modelo Entregable actual)
        console.log('🔍 OPCIÓN A: Solo entregables PROPIOS (lógica actual)');
        const [ownDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.email as estudiante_email
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.estudiante_id = ?
            ORDER BY e.fecha_entrega ASC
        `, [user.id]);
        
        console.log(`📋 Entregables propios: ${ownDeliverables.length}`);
        ownDeliverables.forEach((d, index) => {
            console.log(`${index + 1}. "${d.titulo}" - Proyecto: "${d.proyecto_titulo}"`);
        });
        
        // 3. OPCIÓN B: Todos los entregables del PROYECTO (modelo Deliverable)
        console.log('\n🔍 OPCIÓN B: Todos los entregables del PROYECTO (lógica colaborativa)');
        const [projectDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                p.titulo as proyecto_titulo,
                p.estudiante_id,
                u.email as estudiante_email,
                pu.usuario_id as miembro_id,
                u2.email as miembro_email
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u2 ON pu.usuario_id = u2.id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            ORDER BY e.fecha_entrega ASC
        `, [user.id]);
        
        console.log(`📋 Entregables del proyecto: ${projectDeliverables.length}`);
        projectDeliverables.forEach((d, index) => {
            const isOwn = d.estudiante_id === user.id ? '👤 PROPIO' : '👥 COMPAÑERO';
            console.log(`${index + 1}. "${d.titulo}" - Proyecto: "${d.proyecto_titulo}" ${isOwn}`);
            console.log(`   - Estudiante del entregable: ${d.estudiante_email}`);
        });
        
        // 4. Análisis de proyectos donde s@test.com es miembro
        console.log('\n📁 PROYECTOS DONDE s@test.com ES MIEMBRO:');
        const [memberProjects] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.estudiante_id,
                u1.email as estudiante_principal,
                pu.usuario_id as miembro_id,
                u2.email as miembro_email,
                pu.estado as miembro_estado,
                COUNT(e.id) as entregables_count
            FROM proyectos p
            LEFT JOIN usuarios u1 ON p.estudiante_id = u1.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u2 ON pu.usuario_id = u2.id
            LEFT JOIN entregables e ON p.id = e.proyecto_id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            GROUP BY p.id, p.titulo, p.estudiante_id, u1.email, pu.usuario_id, u2.email, pu.estado
        `, [user.id]);
        
        memberProjects.forEach((p, index) => {
            const isOwner = p.estudiante_id === user.id ? '👤 PROPIETARIO' : '👥 COLABORADOR';
            console.log(`${index + 1}. "${p.titulo}" ${isOwner}`);
            console.log(`   - Estudiante principal: ${p.estudiante_principal}`);
            console.log(`   - Entregables en el proyecto: ${p.entregables_count}`);
        });
        
        // 5. Verificar otros miembros en los proyectos de s@test.com
        console.log('\n👥 OTROS MIEMBROS EN LOS PROYECTOS:');
        const [otherMembers] = await pool.execute(`
            SELECT 
                p.id as proyecto_id,
                p.titulo as proyecto_titulo,
                pu.usuario_id,
                u.email as miembro_email,
                u.nombres,
                u.apellidos,
                pu.estado
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            INNER JOIN usuarios u ON pu.usuario_id = u.id
            WHERE p.id IN (
                SELECT DISTINCT proyecto_id 
                FROM proyecto_usuarios 
                WHERE usuario_id = ? AND estado = 'activo'
            )
            AND pu.usuario_id != ?
            AND pu.estado = 'activo'
            ORDER BY p.titulo, u.email
        `, [user.id, user.id]);
        
        if (otherMembers.length > 0) {
            console.log(`📊 Otros miembros encontrados: ${otherMembers.length}`);
            otherMembers.forEach((m, index) => {
                console.log(`${index + 1}. ${m.miembro_email} en "${m.proyecto_titulo}"`);
            });
        } else {
            console.log('❌ s@test.com no tiene compañeros en sus proyectos');
        }
        
        // 6. Recomendación basada en el análisis
        console.log('\n💡 ANÁLISIS Y RECOMENDACIÓN:');
        
        if (ownDeliverables.length === projectDeliverables.length) {
            console.log('✅ RESULTADO: Ambas lógicas dan el mismo resultado');
            console.log('   - s@test.com solo ve sus propios entregables');
            console.log('   - No hay otros miembros con entregables en sus proyectos');
        } else {
            console.log('⚠️  DIFERENCIA DETECTADA:');
            console.log(`   - Lógica PROPIA: ${ownDeliverables.length} entregables`);
            console.log(`   - Lógica PROYECTO: ${projectDeliverables.length} entregables`);
            console.log('\n🤔 PREGUNTA CLAVE: ¿Los estudiantes deberían ver entregables de compañeros?');
            console.log('\n📋 OPCIONES:');
            console.log('   A) INDIVIDUAL: Solo entregables propios (actual)');
            console.log('   B) COLABORATIVO: Todos los entregables del proyecto');
            
            if (otherMembers.length > 0) {
                console.log('\n👥 CONTEXTO: Hay otros miembros en los proyectos');
                console.log('   - Esto sugiere un enfoque colaborativo');
            }
        }
        
        console.log('\n=== RESUMEN ===');
        console.log(`📊 Entregables propios: ${ownDeliverables.length}`);
        console.log(`📊 Entregables del proyecto: ${projectDeliverables.length}`);
        console.log(`📊 Proyectos como miembro: ${memberProjects.length}`);
        console.log(`📊 Otros miembros: ${otherMembers.length}`);
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

analyzeDeliverableVisibility();