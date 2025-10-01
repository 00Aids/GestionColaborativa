const mysql = require('mysql2/promise');

async function simpleCheck() {
    console.log('🔍 Verificación simple de la base de datos...');
    
    let connection;
    try {
        connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: '',
            database: 'gestion_academica'
        });
        
        console.log('✅ Conectado a la base de datos');
        
        // 1. Verificar usuario ananim
        const [users] = await connection.execute(
            'SELECT id, nombres, apellidos, email FROM usuarios WHERE email = ?',
            ['ananim@gmail.com']
        );
        
        if (users.length === 0) {
            console.log('❌ Usuario ananim@gmail.com no encontrado');
            return;
        }
        
        const ananimUser = users[0];
        console.log(`👤 Usuario: ${ananimUser.nombres} ${ananimUser.apellidos} (ID: ${ananimUser.id})`);
        
        // 2. Verificar si es coordinador
        const [coordinatorRoles] = await connection.execute(`
            SELECT p.id, p.titulo, pu.rol 
            FROM proyectos p 
            JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id 
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
        `, [ananimUser.id]);
        
        console.log(`📋 Es coordinador de ${coordinatorRoles.length} proyectos`);
        
        // 3. Verificar entregables aprobados
        const [approvedCount] = await connection.execute(
            'SELECT COUNT(*) as count FROM entregables WHERE estado = ?',
            ['aceptado']
        );
        
        console.log(`✅ Entregables aprobados en total: ${approvedCount[0].count}`);
        
        // 4. Probar la consulta específica del método findByCoordinatorForReview
        const [deliverables] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.estado,
                p.titulo as proyecto_titulo
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN proyecto_usuarios pu ON p.id = pu.proyecto_id
            WHERE pu.usuario_id = ? AND pu.rol = 'coordinador'
            AND e.estado IN ('entregado', 'en_revision', 'requiere_cambios', 'pendiente', 'rechazado', 'aceptado')
            ORDER BY e.fecha_entrega DESC
        `, [ananimUser.id]);
        
        console.log(`📦 Entregables encontrados para ananim como coordinador: ${deliverables.length}`);
        
        const statusCounts = {};
        deliverables.forEach(d => {
            statusCounts[d.estado] = (statusCounts[d.estado] || 0) + 1;
            if (d.estado === 'aceptado') {
                console.log(`   ✅ Aprobado: ${d.titulo} (ID: ${d.id}) - Proyecto: ${d.proyecto_titulo}`);
            }
        });
        
        console.log('📊 Resumen por estado:');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`   - ${status}: ${count}`);
        });
        
        if (statusCounts['aceptado'] > 0) {
            console.log('🎉 ¡ÉXITO! Los entregables aprobados aparecen en la consulta');
        } else {
            console.log('❌ No se encontraron entregables aprobados para ananim como coordinador');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

simpleCheck();