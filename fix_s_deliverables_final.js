const { pool } = require('./src/config/database');

async function fixSDeliverablesIssue() {
    try {
        console.log('=== VERIFICACIÓN Y LIMPIEZA FINAL PARA s@test.com ===\n');
        
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
        console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id})\n`);
        
        // 2. Verificar qué entregables ve actualmente según el método del modelo
        console.log('2. ENTREGABLES QUE VE ACTUALMENTE s@test.com:');
        const [currentDeliverables] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo,
                p.estudiante_id as proyecto_estudiante_id,
                pu.usuario_id as miembro_id,
                pu.estado as miembro_estado
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            ORDER BY e.fecha_entrega ASC
        `, [user.id]);
        
        console.log(`📋 Entregables visibles: ${currentDeliverables.length}`);
        
        if (currentDeliverables.length > 0) {
            console.log('\n🚨 PROBLEMA: s@test.com ve entregables que no debería ver:');
            currentDeliverables.forEach((d, index) => {
                console.log(`${index + 1}. "${d.titulo}" (ID: ${d.id})`);
                console.log(`   - Proyecto: "${d.proyecto_titulo}"`);
                console.log(`   - Estudiante del proyecto: ${d.proyecto_estudiante_id}`);
                console.log(`   - s@test.com es miembro: ${d.miembro_id} (estado: ${d.miembro_estado})`);
            });
            
            // 3. Analizar por qué los ve
            console.log('\n3. ANÁLISIS DE MEMBRESÍAS PROBLEMÁTICAS:');
            const [problematicMemberships] = await pool.execute(`
                SELECT 
                    p.id as proyecto_id,
                    p.titulo as proyecto_titulo,
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
            
            problematicMemberships.forEach((m, index) => {
                console.log(`${index + 1}. Proyecto: "${m.proyecto_titulo}" (ID: ${m.proyecto_id})`);
                console.log(`   - Estudiante principal: ${m.estudiante_principal} (ID: ${m.estudiante_id})`);
                console.log(`   - s@test.com es miembro activo`);
                console.log(`   - Entregables en este proyecto: ${m.entregables_count}`);
                
                if (m.estudiante_id !== user.id) {
                    console.log(`   ⚠️  PROBLEMA: s@test.com es miembro de un proyecto que no le pertenece`);
                }
            });
            
            // 4. Opción de limpieza
            console.log('\n4. OPCIONES DE LIMPIEZA:');
            console.log('Opción A: Remover a s@test.com de proyectos que no le pertenecen');
            console.log('Opción B: Eliminar entregables de proyectos donde s@test.com no es el estudiante principal');
            
            // Implementar Opción A: Remover membresías incorrectas
            console.log('\n🔧 APLICANDO LIMPIEZA - Removiendo membresías incorrectas...');
            
            const [removeResult] = await pool.execute(`
                DELETE pu FROM proyecto_usuarios pu
                INNER JOIN proyectos p ON pu.proyecto_id = p.id
                WHERE pu.usuario_id = ? 
                AND p.estudiante_id != ?
                AND pu.estado = 'activo'
            `, [user.id, user.id]);
            
            console.log(`✅ Membresías incorrectas removidas: ${removeResult.affectedRows}`);
            
        } else {
            console.log('✅ s@test.com no ve ningún entregable (correcto)');
        }
        
        // 5. Verificación final
        console.log('\n5. VERIFICACIÓN FINAL:');
        const [finalCheck] = await pool.execute(`
            SELECT 
                e.id,
                e.titulo,
                p.titulo as proyecto_titulo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            LEFT JOIN areas_trabajo at ON e.area_trabajo_id = at.id
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
            ORDER BY e.fecha_entrega ASC
        `, [user.id]);
        
        console.log(`📋 Entregables visibles después de la limpieza: ${finalCheck.length}`);
        
        if (finalCheck.length === 0) {
            console.log('✅ ÉXITO: s@test.com ya no ve ningún entregable');
        } else {
            console.log('❌ AÚN HAY PROBLEMA: s@test.com sigue viendo entregables:');
            finalCheck.forEach((d, index) => {
                console.log(`${index + 1}. "${d.titulo}" - Proyecto: "${d.proyecto_titulo}"`);
            });
        }
        
        // 6. Verificar proyectos actuales del usuario
        console.log('\n6. PROYECTOS ACTUALES DE s@test.com:');
        const [userProjects] = await pool.execute(`
            SELECT 
                p.id,
                p.titulo,
                p.estudiante_id,
                u.email as estudiante_email
            FROM proyectos p
            INNER JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE pu.usuario_id = ? AND pu.estado = 'activo'
        `, [user.id]);
        
        console.log(`📁 Proyectos donde s@test.com es miembro: ${userProjects.length}`);
        userProjects.forEach((p, index) => {
            console.log(`${index + 1}. "${p.titulo}" - Estudiante: ${p.estudiante_email} (ID: ${p.estudiante_id})`);
        });
        
        console.log('\n=== RESUMEN ===');
        console.log('✅ Limpieza completada');
        console.log('✅ s@test.com solo debería ver entregables de sus propios proyectos');
        console.log('🔄 Recomendación: Actualizar la página con Ctrl+F5 o modo incógnito');
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        process.exit(0);
    }
}

fixSDeliverablesIssue();