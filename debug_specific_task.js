const mysql = require('mysql2/promise');
require('dotenv').config();

async function debugSpecificTask() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Verificando datos de la tarea específica...\n');

        // Primero, obtener todas las tareas del proyecto 35
        const [tasks] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.asignado_a,
                e.observaciones
            FROM entregables e
            WHERE e.proyecto_id = 35
            ORDER BY e.id
        `);

        console.log('📋 Tareas del proyecto 35:');
        tasks.forEach(task => {
            console.log(`\n--- Tarea ID: ${task.id} ---`);
            console.log(`Título: ${task.titulo}`);
            console.log(`asignado_a: ${task.asignado_a}`);
            console.log(`observaciones: ${task.observaciones}`);
            
            // Verificar si hay asignación en observaciones
            if (task.observaciones) {
                try {
                    const obs = JSON.parse(task.observaciones);
                    console.log(`observaciones.asignado_a: ${obs.asignado_a || 'No definido'}`);
                } catch (e) {
                    console.log('observaciones no es JSON válido');
                }
            }
        });

        // Ahora verificar con la misma query que usa getTaskDetails
        console.log('\n\n🔍 Verificando con la query EXACTA de getTaskDetails...\n');
        
        for (const task of tasks) {
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
            `, [task.id]);

            if (detailResult.length > 0) {
                const detail = detailResult[0];
                console.log(`\n--- Resultado getTaskDetails para tarea ${task.id} ---`);
                console.log(`Título: ${detail.titulo}`);
                console.log(`asignado_a: ${detail.asignado_a}`);
                console.log(`asignado_nombres: ${detail.asignado_nombres}`);
                console.log(`asignado_apellidos: ${detail.asignado_apellidos}`);
                console.log(`COALESCE result: ${detail.asignado_a || 'NULL'}`);
                
                // Verificar manualmente el COALESCE
                let coalesceResult = detail.asignado_a;
                if (!coalesceResult && detail.observaciones) {
                    try {
                        const obs = JSON.parse(detail.observaciones);
                        coalesceResult = obs.asignado_a;
                    } catch (e) {
                        // ignore
                    }
                }
                console.log(`Manual COALESCE: ${coalesceResult || 'NULL'}`);
            }
        }

        // Verificar usuarios disponibles
        console.log('\n\n👥 Usuarios disponibles en el sistema:');
        const [users] = await connection.execute(`
            SELECT id, nombres, apellidos, email, rol 
            FROM usuarios 
            ORDER BY id
        `);
        
        users.forEach(user => {
            console.log(`ID: ${user.id}, Nombre: ${user.nombres} ${user.apellidos}, Email: ${user.email}, Rol: ${user.rol}`);
        });

        // Verificar si existe la tabla fases_proyecto
        console.log('\n\n🔍 Verificando tabla fases_proyecto:');
        try {
            const [phases] = await connection.execute(`SELECT * FROM fases_proyecto LIMIT 5`);
            console.log(`✅ Tabla fases_proyecto existe, ${phases.length} registros encontrados`);
            phases.forEach(phase => {
                console.log(`ID: ${phase.id}, Nombre: ${phase.nombre}, Proyecto: ${phase.proyecto_id}`);
            });
        } catch (error) {
            console.log(`❌ Error con tabla fases_proyecto: ${error.message}`);
        }

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

debugSpecificTask();