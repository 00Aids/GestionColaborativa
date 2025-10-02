const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkSUserAssignment() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || 'root',
        database: process.env.DB_NAME || 'gestion_colaborativa'
    });

    try {
        console.log('🔍 Verificando asignación del usuario s@test.com...\n');

        // Primero, obtener el ID del usuario s@test.com
        const [userResult] = await connection.execute(`
            SELECT id, nombres, apellidos, email 
            FROM usuarios 
            WHERE email = 's@test.com'
        `);
        
        if (userResult.length === 0) {
            console.log('❌ Usuario s@test.com no encontrado');
            return;
        }

        const user = userResult[0];
        console.log(`👤 Usuario encontrado: ID ${user.id}, ${user.nombres} ${user.apellidos}, ${user.email}`);

        // Buscar todas las tareas asignadas a este usuario en el proyecto 35
        console.log('\n🔍 Buscando tareas asignadas en proyecto 35...');
        
        const [tasksResult] = await connection.execute(`
            SELECT 
                id, 
                titulo, 
                asignado_a, 
                observaciones,
                JSON_UNQUOTE(JSON_EXTRACT(observaciones, '$.asignado_a')) as obs_asignado_a,
                created_at,
                updated_at
            FROM entregables 
            WHERE proyecto_id = 35 
            AND (asignado_a = ? OR JSON_UNQUOTE(JSON_EXTRACT(observaciones, '$.asignado_a')) = ?)
        `, [user.id, user.id]);

        console.log(`\n📋 Tareas encontradas: ${tasksResult.length}`);
        
        if (tasksResult.length > 0) {
            tasksResult.forEach(task => {
                console.log(`\n--- Tarea ID: ${task.id} ---`);
                console.log(`Título: ${task.titulo}`);
                console.log(`asignado_a: ${task.asignado_a}`);
                console.log(`obs_asignado_a: ${task.obs_asignado_a}`);
                console.log(`observaciones completas: ${task.observaciones}`);
                console.log(`Creada: ${task.created_at}`);
                console.log(`Actualizada: ${task.updated_at}`);
            });
        }

        // También verificar con la query exacta del getTaskDetails para estas tareas
        if (tasksResult.length > 0) {
            console.log('\n🔍 Verificando con query getTaskDetails...');
            
            for (const task of tasksResult) {
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
                    console.log(`\n--- getTaskDetails para tarea ${task.id} ---`);
                    console.log(`asignado_nombres: ${detail.asignado_nombres}`);
                    console.log(`asignado_apellidos: ${detail.asignado_apellidos}`);
                    console.log(`COALESCE result: ${detail.asignado_a || 'NULL'}`);
                }
            }
        }

        // Verificar TODAS las tareas del proyecto 35 para ver si alguna tiene asignación en observaciones
        console.log('\n🔍 Verificando TODAS las tareas del proyecto 35...');
        
        const [allTasksResult] = await connection.execute(`
            SELECT 
                id, 
                titulo, 
                asignado_a, 
                observaciones,
                JSON_UNQUOTE(JSON_EXTRACT(observaciones, '$.asignado_a')) as obs_asignado_a
            FROM entregables 
            WHERE proyecto_id = 35
            ORDER BY id
        `);

        console.log(`\n📋 Total de tareas en proyecto 35: ${allTasksResult.length}`);
        
        allTasksResult.forEach(task => {
            if (task.asignado_a || task.obs_asignado_a) {
                console.log(`\n--- Tarea con asignación: ${task.id} ---`);
                console.log(`Título: ${task.titulo}`);
                console.log(`asignado_a: ${task.asignado_a}`);
                console.log(`obs_asignado_a: ${task.obs_asignado_a}`);
            }
        });

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

checkSUserAssignment();