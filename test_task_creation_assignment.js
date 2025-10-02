const mysql = require('mysql2/promise');
require('dotenv').config();

async function testTaskCreationWithAssignment() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('=== PRUEBA DE CREACIÓN DE TAREA CON ASIGNACIÓN ===\n');

        // 1. Verificar usuarios disponibles en proyecto 35
        console.log('1. Usuarios disponibles en proyecto 35:');
        const [users] = await connection.execute(`
            SELECT u.id, u.nombres, u.apellidos, u.email, r.nombre as rol_nombre
            FROM usuarios u
            JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            JOIN roles r ON u.rol_id = r.id
            WHERE pu.proyecto_id = 35 AND u.activo = 1
            ORDER BY u.nombres
        `);
        
        users.forEach(user => {
            console.log(`   - ID: ${user.id}, Nombre: ${user.nombres} ${user.apellidos}, Email: ${user.email}, Rol: ${user.rol_nombre}`);
        });

        if (users.length === 0) {
            console.log('   ❌ No hay usuarios en el proyecto 35');
            return;
        }

        // 2. Seleccionar el usuario s@test.com para la prueba
        const testUser = users.find(u => u.email === 's@test.com');
        if (!testUser) {
            console.log('   ❌ Usuario s@test.com no encontrado en el proyecto');
            return;
        }

        console.log(`\n2. Usuario seleccionado para asignación: ${testUser.nombres} ${testUser.apellidos} (ID: ${testUser.id})`);

        // 3. Simular la creación de tarea usando el mismo método que el controlador
        const taskData = {
            proyecto_id: 35,
            fase_id: 1,
            titulo: 'Tarea de Prueba con Asignación',
            descripcion: 'Esta es una tarea de prueba para verificar la asignación',
            fecha_limite: '2024-02-15',
            prioridad: 'medium',
            asignado_a: testUser.id,
            estimacion_horas: 5,
            etiquetas: 'prueba,asignacion',
            estado_workflow: 'todo'
        };

        console.log('\n3. Datos de la tarea a crear:');
        console.log(JSON.stringify(taskData, null, 2));

        // 4. Ejecutar la query de inserción (igual que en el modelo Task)
        const insertQuery = `
            INSERT INTO entregables (
                proyecto_id, fase_id, titulo, descripcion, 
                fecha_limite, prioridad, asignado_a, estado, 
                estado_workflow, observaciones
            ) VALUES (?, ?, ?, ?, ?, ?, ?, 'pendiente', ?, ?)
        `;

        const observaciones = {
            tipo_enfoque: 'feature',
            estimacion_horas: taskData.estimacion_horas,
            etiquetas: taskData.etiquetas
        };

        console.log('\n4. Ejecutando inserción...');
        const [result] = await connection.execute(insertQuery, [
            taskData.proyecto_id, 
            taskData.fase_id, 
            taskData.titulo, 
            taskData.descripcion, 
            taskData.fecha_limite, 
            taskData.prioridad, 
            taskData.asignado_a, 
            taskData.estado_workflow,
            JSON.stringify(observaciones)
        ]);

        const newTaskId = result.insertId;
        console.log(`   ✅ Tarea creada con ID: ${newTaskId}`);

        // 5. Verificar que la tarea se creó correctamente con la asignación
        console.log('\n5. Verificando la tarea creada:');
        const [createdTask] = await connection.execute(`
            SELECT 
                id, titulo, descripcion, proyecto_id, fase_id,
                fecha_limite, prioridad, asignado_a, estado,
                estado_workflow, observaciones, created_at
            FROM entregables 
            WHERE id = ?
        `, [newTaskId]);

        if (createdTask.length > 0) {
            const task = createdTask[0];
            console.log('   Tarea creada:');
            console.log(`   - ID: ${task.id}`);
            console.log(`   - Título: ${task.titulo}`);
            console.log(`   - Proyecto ID: ${task.proyecto_id}`);
            console.log(`   - Asignado a: ${task.asignado_a}`);
            console.log(`   - Prioridad: ${task.prioridad}`);
            console.log(`   - Estado: ${task.estado}`);
            console.log(`   - Estado Workflow: ${task.estado_workflow}`);
            console.log(`   - Observaciones: ${task.observaciones}`);

            // 6. Verificar usando la query del modal (getTaskDetails)
            console.log('\n6. Verificando con la query del modal:');
            const [modalData] = await connection.execute(`
                SELECT 
                    e.*,
                    CONCAT('TASK-', LPAD(e.id, 4, '0')) as codigo,
                    p.titulo as proyecto_titulo,
                    fp.nombre as fase_nombre,
                    COALESCE(e.asignado_a, JSON_UNQUOTE(JSON_EXTRACT(e.observaciones, '$.asignado_a'))) as asignado_final,
                    COALESCE(
                        CONCAT(u.nombres, ' ', u.apellidos),
                        CONCAT(u2.nombres, ' ', u2.apellidos),
                        'Sin asignar'
                    ) as asignado_nombre_completo,
                    u.nombres as asignado_nombres,
                    u.apellidos as asignado_apellidos
                FROM entregables e
                LEFT JOIN proyectos p ON e.proyecto_id = p.id
                LEFT JOIN fases_proyecto fp ON e.fase_id = fp.id
                LEFT JOIN usuarios u ON e.asignado_a = u.id
                LEFT JOIN usuarios u2 ON JSON_UNQUOTE(JSON_EXTRACT(e.observaciones, '$.asignado_a')) = u2.id
                WHERE e.id = ?
            `, [newTaskId]);

            if (modalData.length > 0) {
                const modal = modalData[0];
                console.log('   Datos del modal:');
                console.log(`   - Asignado final: ${modal.asignado_final}`);
                console.log(`   - Nombre completo: ${modal.asignado_nombre_completo}`);
                console.log(`   - Nombres: ${modal.asignado_nombres}`);
                console.log(`   - Apellidos: ${modal.asignado_apellidos}`);

                if (modal.asignado_final && modal.asignado_nombres) {
                    console.log('   ✅ La asignación funciona correctamente!');
                } else {
                    console.log('   ❌ La asignación no se está mostrando correctamente');
                }
            }
        }

        console.log('\n=== FIN DE LA PRUEBA ===');

    } catch (error) {
        console.error('Error en la prueba:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

testTaskCreationWithAssignment();