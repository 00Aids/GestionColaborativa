const Entregable = require('./src/models/Entregable');
const { pool } = require('./src/config/database');

async function verifyFinalState() {
    try {
        console.log('=== VERIFICACIÓN FINAL ===');
        
        const entregableModel = new Entregable();
        const deliverables = await entregableModel.findByStudent(62);
        
        console.log(`Entregables para s@test.com (ID: 62): ${deliverables.length}`);
        
        if (deliverables.length === 0) {
            console.log('✅ ¡ÉXITO! s@test.com ya no tiene entregables asignados');
            console.log('✅ El problema ha sido resuelto completamente');
        } else {
            console.log('⚠️ Aún hay entregables:');
            deliverables.forEach((d, i) => {
                console.log(`${i+1}. "${d.titulo}" - Proyecto: "${d.proyecto_nombre}"`);
            });
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    } finally {
        await pool.end();
    }
}

verifyFinalState();