const mysql = require('mysql2/promise');
require('dotenv').config();

async function assignTaskTest() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Asignando tarea para prueba...\n');

        // Primero, obtener usuarios disponibles
        const [users] = await connection.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            ORDER BY id
        `);
        
        console.log('👥 Usuarios disponibles:');
        users.forEach(user => {
            console.log(`ID: ${user.id}, Nombre: ${user.nombres} ${user.apellidos}, Email: ${user.email}`);
        });

        if (users.length === 0) {
            console.log('❌ No hay usuarios disponibles');
            return;
        }

        // Asignar la tarea 33 (jejejejej) al primer usuario disponible
        const taskId = 33;
        const userId = users[0].id;
        
        console.log(`\n🎯 Asignando tarea ${taskId} al usuario ${userId} (${users[0].nombres} ${users[0].apellidos})`);
        
        const [updateResult] = await connection.execute(`
            UPDATE entregables 
            SET asignado_a = ?, updated_at = NOW() 
            WHERE id = ?
        `, [userId, taskId]);

        console.log(`✅ Tarea asignada. Filas afectadas: ${updateResult.affectedRows}`);

        // Verificar el resultado con la query de getTaskDetails
        console.log('\n🔍 Verificando resultado con getTaskDetails...');
        
        const [detailResult] = await connection.execute(`
            SELECT 
                e.*,
                p.titulo as proyecto_titulo,
                fp.nombre as fase_nombre,
                ua.nombres as asignado_nombres,
                ua.apellidos as asignado_apellidos,
                ua.foto_perfil as asignado_foto
            FROM entregables e
            LEFT JOIN proyectos p ON e.proyecto_id = p.id
            LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
            LEFT JOIN usuarios ua ON (
                ua.id = COALESCE(
                    e.asignado_a, 
                    JSON_UNQUOTE(JSON_EXTRACT(e.observaciones, '$.asignado_a'))
                )
            )
            WHERE e.id = ?
        `, [taskId]);

        if (detailResult.length > 0) {
            const detail = detailResult[0];
            console.log(`\n--- Resultado después de asignación ---`);
            console.log(`Título: ${detail.titulo}`);
            console.log(`asignado_a: ${detail.asignado_a}`);
            console.log(`asignado_nombres: ${detail.asignado_nombres}`);
            console.log(`asignado_apellidos: ${detail.asignado_apellidos}`);
            
            if (detail.asignado_nombres && detail.asignado_apellidos) {
                console.log(`✅ ¡ÉXITO! La tarea ahora muestra: ${detail.asignado_nombres} ${detail.asignado_apellidos}`);
            } else {
                console.log(`❌ La asignación no se está mostrando correctamente`);
            }
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

assignTaskTest();