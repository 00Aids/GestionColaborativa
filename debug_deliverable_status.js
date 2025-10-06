const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkDeliverableStatus() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_academica'
    });

    try {
        console.log('=== VERIFICANDO ESTADO DEL ENTREGABLE ID 1 ===');
        
        // Verificar el entregable específico
        const [deliverable] = await connection.execute(`
            SELECT e.*, p.nombre as proyecto_nombre, p.coordinador_id, p.estudiante_id
            FROM entregables e
            JOIN proyectos p ON e.proyecto_id = p.id
            WHERE e.id = 1
        `);
        
        console.log('📋 Entregable encontrado:', deliverable[0]);
        
        if (deliverable[0]) {
            const entregableData = deliverable[0];
            
            // Verificar información del coordinador
            const [coordinator] = await connection.execute(`
                SELECT id, email, nombre, area_trabajo_id
                FROM usuarios
                WHERE id = ?
            `, [entregableData.coordinador_id]);
            
            console.log('👨‍💼 Coordinador del proyecto:', coordinator[0]);
            
            // Verificar información del estudiante
            const [student] = await connection.execute(`
                SELECT id, email, nombre, area_trabajo_id
                FROM usuarios
                WHERE id = ?
            `, [entregableData.estudiante_id]);
            
            console.log('👨‍🎓 Estudiante del proyecto:', student[0]);
            
            // Verificar si hay entregables para revisar por el coordinador
            console.log('\n=== CONSULTANDO ENTREGABLES PARA COORDINADOR ===');
            const [coordinatorDeliverables] = await connection.execute(`
                SELECT e.id, e.nombre, e.estado, e.contenido, e.fecha_entrega, 
                       p.nombre as proyecto_nombre, u.nombre as estudiante_nombre
                FROM entregables e
                JOIN proyectos p ON e.proyecto_id = p.id
                JOIN usuarios u ON p.estudiante_id = u.id
                WHERE p.coordinador_id = ? AND e.estado IN ('enviado', 'en_revision')
                ORDER BY e.fecha_entrega DESC
            `, [entregableData.coordinador_id]);
            
            console.log('📝 Entregables para revisar por coordinador:', coordinatorDeliverables);
            
            // Verificar el historial de cambios del entregable
            console.log('\n=== HISTORIAL DEL ENTREGABLE ===');
            const [history] = await connection.execute(`
                SELECT * FROM historial_actividades 
                WHERE entregable_id = 1 
                ORDER BY fecha_actividad DESC
                LIMIT 10
            `);
            
            console.log('📚 Historial de actividades:', history);
        }
        
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

checkDeliverableStatus();