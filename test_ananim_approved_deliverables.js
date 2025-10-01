const mysql = require('mysql2/promise');
const EntregableController = require('./src/controllers/EntregableController');
const Entregable = require('./src/models/Entregable');

async function testAnanimApprovedDeliverables() {
    console.log('🧪 Test específico para ananim@gmail.com - Entregables aprobados...');
    
    let connection;
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gestion_academica'
        });
        console.log('✅ Conexión a la base de datos establecida');

        // Verificar si ananim@gmail.com existe
        const [ananimUser] = await connection.execute(
            'SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ?',
            ['ananim@gmail.com']
        );
        
        if (ananimUser.length === 0) {
            console.log('❌ Usuario ananim@gmail.com no encontrado');
            return;
        }
        
        console.log(`👤 Usuario encontrado: ${ananimUser[0].nombres} ${ananimUser[0].apellidos} (${ananimUser[0].email})`);
        
        // Verificar entregables con estado 'aceptado'
        const [acceptedDeliverables] = await connection.execute(
            'SELECT COUNT(*) as count FROM entregables WHERE estado = ?',
            ['aceptado']
        );
        console.log(`📊 Total de entregables con estado 'aceptado': ${acceptedDeliverables[0].count}`);
        
        // Verificar si ananim es coordinador de algún proyecto
        const [coordinatorProjects] = await connection.execute(`
            SELECT p.id, p.titulo, pu.rol 
            FROM proyectos p 
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id 
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [ananimUser[0].id]);
        
        console.log(`📋 Proyectos donde ananim es coordinador: ${coordinatorProjects.length}`);
        coordinatorProjects.forEach(project => {
            console.log(`   - ${project.titulo} (ID: ${project.id})`);
        });
        
        // Probar el método findByCoordinatorForReview directamente
        const entregableModel = new Entregable();
        const deliverables = await entregableModel.findByCoordinatorForReview(ananimUser[0].id);
        
        console.log(`📦 Entregables encontrados por findByCoordinatorForReview: ${deliverables.length}`);
        
        // Contar por estado
        const statusCounts = {};
        deliverables.forEach(d => {
            statusCounts[d.estado] = (statusCounts[d.estado] || 0) + 1;
        });
        
        console.log('📊 Entregables por estado:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   - ${status}: ${count}`);
        });
        
        // Verificar específicamente los aprobados
        const approvedDeliverables = deliverables.filter(d => d.estado === 'aceptado');
        console.log(`✅ Entregables aprobados encontrados: ${approvedDeliverables.length}`);
        
        if (approvedDeliverables.length > 0) {
            console.log('🎉 ¡ÉXITO! Los entregables aprobados ahora aparecen correctamente');
            approvedDeliverables.forEach(d => {
                console.log(`   - ${d.titulo} (ID: ${d.id}) - Proyecto: ${d.proyecto_titulo}`);
            });
        } else {
            console.log('❌ Los entregables aprobados aún no aparecen');
        }
        
    } catch (error) {
        console.error('❌ Error en el test:', error.message);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔌 Conexión cerrada');
        }
    }
}

testAnanimApprovedDeliverables();