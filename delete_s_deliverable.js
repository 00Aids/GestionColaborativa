const { pool } = require('./src/config/database');
const Entregable = require('./src/models/Entregable');

async function deleteStudentDeliverable() {
    console.log('=== ELIMINACIÓN DE ENTREGABLE DE s@test.com ===\n');
    
    try {
        // 1. Verificar usuario s@test.com
        console.log('🔍 Verificando usuario s@test.com...');
        const [userRows] = await pool.execute(
            'SELECT id, email FROM usuarios WHERE email = ?',
            ['s@test.com']
        );
        
        if (userRows.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }
        
        const user = userRows[0];
        console.log(`✅ Usuario encontrado: ${user.email} (ID: ${user.id})\n`);
        
        // 2. Verificar entregables actuales
        console.log('📋 Entregables actuales para s@test.com:');
        const entregableModel = new Entregable();
        const currentDeliverables = await entregableModel.findByStudent(user.id);
        
        if (currentDeliverables.length === 0) {
            console.log('✅ No hay entregables para eliminar');
            return;
        }
        
        console.log(`📊 Entregables encontrados: ${currentDeliverables.length}`);
        currentDeliverables.forEach((deliverable, index) => {
            console.log(`${index + 1}. "${deliverable.titulo}" (ID: ${deliverable.id}) - Proyecto: "${deliverable.proyecto_nombre}"`);
        });
        
        // 3. Eliminar entregables directamente
        console.log('\n🗑️ Eliminando entregables...');
        for (const deliverable of currentDeliverables) {
            console.log(`❌ Eliminando entregable: "${deliverable.titulo}" (ID: ${deliverable.id})`);
            await pool.execute(
                'DELETE FROM entregables WHERE id = ?',
                [deliverable.id]
            );
        }
        
        // 5. Verificación final con consulta directa
        console.log('\n🔍 VERIFICACIÓN FINAL (Consulta directa):');
        const [finalCheck] = await pool.execute(`
            SELECT e.id, e.titulo, p.titulo as proyecto_nombre
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = ?
        `, [user.id]);
        
        console.log(`📊 Entregables restantes (consulta directa): ${finalCheck.length}`);
        
        // 6. Verificación final con modelo
        console.log('\n🔍 VERIFICACIÓN FINAL (Modelo Entregable):');
        const finalDeliverables = await entregableModel.findByStudent(user.id);
        console.log(`📊 Entregables restantes (modelo): ${finalDeliverables.length}`);
        
        if (finalDeliverables.length === 0) {
            console.log('✅ ¡ÉXITO! s@test.com ya no tiene entregables asignados');
        } else {
            console.log('⚠️ Aún quedan entregables:');
            finalDeliverables.forEach((deliverable, index) => {
                console.log(`${index + 1}. "${deliverable.titulo}" - Proyecto: "${deliverable.proyecto_nombre}"`);
            });
        }
        
        console.log('\n=== PROCESO COMPLETADO ===');
        
    } catch (error) {
        console.error('❌ Error durante la eliminación:', error);
    } finally {
        await pool.end();
    }
}

deleteStudentDeliverable();