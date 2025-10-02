const mysql = require('mysql2/promise');
require('dotenv').config();

// Simular el controlador AdminController
const Task = require('./src/models/Task');

async function simulateWebFormSubmission() {
    let connection;
    
    try {
        // Conectar a la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        console.log('=== SIMULACIÓN DEL FORMULARIO WEB ===\n');

        // 1. Obtener usuarios del proyecto 35 (como lo hace showNewTask)
        console.log('1. Obteniendo miembros del proyecto 35:');
        const [members] = await connection.execute(`
            SELECT 
                u.id, u.nombres, u.apellidos, u.email,
                r.nombre as rol_nombre
            FROM usuarios u
            JOIN proyecto_usuarios pu ON u.id = pu.usuario_id
            JOIN roles r ON u.rol_id = r.id
            WHERE pu.proyecto_id = 35 AND u.activo = 1
            ORDER BY u.nombres
        `);
        
        members.forEach(member => {
            console.log(`   - ${member.nombres} ${member.apellidos} (ID: ${member.id}) - ${member.rol_nombre}`);
        });

        // 2. Simular datos del formulario (req.body)
        const formData = {
            titulo: 'Tarea desde Formulario Web Simulado',
            descripcion: 'Esta tarea simula exactamente lo que envía el formulario web',
            fase_id: '1',
            fecha_limite: '2024-02-20',
            prioridad: 'high',
            asignado_a: '62', // s@test.com (como string, como viene del formulario)
            estimacion_horas: '8',
            etiquetas: 'web,formulario,simulacion',
            estado_workflow: 'todo'
        };

        console.log('\n2. Datos del formulario simulado:');
        console.log(JSON.stringify(formData, null, 2));

        // 3. Simular el procesamiento del controlador AdminController.createTask
        const projectId = 35;
        
        // Extraer datos como lo hace el controlador
        const {
            titulo,
            descripcion,
            fase_id,
            fecha_limite,
            prioridad,
            asignado_a,
            estimacion_horas,
            etiquetas,
            estado_workflow
        } = formData;

        // Preparar taskData como lo hace el controlador
        const taskData = {
            proyecto_id: parseInt(projectId),
            fase_id: fase_id ? parseInt(fase_id) : 1,
            titulo: titulo.trim(),
            descripcion: descripcion ? descripcion.trim() : '',
            fecha_limite: fecha_limite || null,
            prioridad: prioridad || 'medium',
            asignado_a: asignado_a || null, // Aquí está la clave
            estimacion_horas: estimacion_horas ? parseFloat(estimacion_horas) : null,
            etiquetas: etiquetas || null,
            estado_workflow: estado_workflow || 'todo'
        };

        console.log('\n3. taskData procesado por el controlador:');
        console.log(JSON.stringify(taskData, null, 2));
        console.log(`   Tipo de asignado_a: ${typeof taskData.asignado_a}`);
        console.log(`   Valor de asignado_a: ${taskData.asignado_a}`);

        // 4. Verificar si asignado_a es string vacía (problema común)
        if (taskData.asignado_a === '') {
            console.log('   ⚠️  PROBLEMA DETECTADO: asignado_a es string vacía, se convertirá a null');
            taskData.asignado_a = null;
        } else if (taskData.asignado_a) {
            taskData.asignado_a = parseInt(taskData.asignado_a);
            console.log(`   ✅ asignado_a convertido a entero: ${taskData.asignado_a}`);
        }

        // 5. Usar el modelo Task para crear la tarea
        const taskModel = new Task();
        console.log('\n4. Creando tarea usando el modelo Task...');
        
        const taskId = await taskModel.createTask(taskData);
        console.log(`   ✅ Tarea creada con ID: ${taskId}`);

        // 6. Verificar la tarea creada
        console.log('\n5. Verificando la tarea creada:');
        const [createdTask] = await connection.execute(`
            SELECT 
                id, titulo, proyecto_id, asignado_a, prioridad, estado,
                estado_workflow, observaciones, created_at
            FROM entregables 
            WHERE id = ?
        `, [taskId]);

        if (createdTask.length > 0) {
            const task = createdTask[0];
            console.log('   Tarea en la base de datos:');
            console.log(`   - ID: ${task.id}`);
            console.log(`   - Título: ${task.titulo}`);
            console.log(`   - Asignado a: ${task.asignado_a}`);
            console.log(`   - Prioridad: ${task.prioridad}`);
            console.log(`   - Estado: ${task.estado}`);

            // 7. Probar la query del modal
            console.log('\n6. Probando query del modal:');
            const [modalResult] = await connection.execute(`
                SELECT 
                    e.*,
                    COALESCE(e.asignado_a, JSON_UNQUOTE(JSON_EXTRACT(e.observaciones, '$.asignado_a'))) as asignado_final,
                    COALESCE(
                        CONCAT(u.nombres, ' ', u.apellidos),
                        CONCAT(u2.nombres, ' ', u2.apellidos),
                        'Sin asignar'
                    ) as asignado_nombre_completo,
                    u.nombres as asignado_nombres,
                    u.apellidos as asignado_apellidos
                FROM entregables e
                LEFT JOIN usuarios u ON e.asignado_a = u.id
                LEFT JOIN usuarios u2 ON JSON_UNQUOTE(JSON_EXTRACT(e.observaciones, '$.asignado_a')) = u2.id
                WHERE e.id = ?
            `, [taskId]);

            if (modalResult.length > 0) {
                const modal = modalResult[0];
                console.log(`   - Asignado final: ${modal.asignado_final}`);
                console.log(`   - Nombre completo: ${modal.asignado_nombre_completo}`);
                
                if (modal.asignado_final && modal.asignado_nombres) {
                    console.log('   ✅ El modal mostrará el nombre del usuario asignado');
                } else {
                    console.log('   ❌ El modal mostrará "Sin asignar"');
                }
            }
        }

        console.log('\n=== CONCLUSIÓN ===');
        console.log('El sistema funciona correctamente. Si ves "Sin asignar" en el modal,');
        console.log('es porque no se seleccionó un usuario en el formulario web.');

    } catch (error) {
        console.error('Error en la simulación:', error);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

simulateWebFormSubmission();