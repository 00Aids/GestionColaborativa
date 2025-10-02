const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkCurrentTasks() {
    console.log('🚀 Iniciando consulta de tareas...');
    
    let connection;
    
    try {
        console.log('📡 Intentando conectar a la base de datos...');
        
        // Configuración de la base de datos
        connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || 'root',
            database: process.env.DB_NAME || 'gestion_academica',
            port: process.env.DB_PORT || 3306
        });

        console.log('✅ Conectado a la base de datos exitosamente');

        // Primero verificar si la tabla existe
        console.log('🔍 Verificando estructura de la tabla entregables...');
        
        const [tableInfo] = await connection.execute(`
            DESCRIBE entregables
        `);
        
        console.log('📋 Estructura de la tabla entregables:');
        tableInfo.forEach(column => {
            console.log(`   - ${column.Field}: ${column.Type} (${column.Null === 'YES' ? 'NULL' : 'NOT NULL'})`);
        });

        // Consultar el número total de tareas
        console.log('\n🔢 Contando tareas...');
        const [countResult] = await connection.execute(`
            SELECT COUNT(*) as total FROM entregables
        `);
        
        const totalTasks = countResult[0].total;
        console.log(`📊 Total de tareas en la base de datos: ${totalTasks}`);

        if (totalTasks === 0) {
            console.log('❌ No hay tareas en la base de datos');
            return;
        }

        // Consultar todas las tareas básicas
        console.log('\n📋 Consultando todas las tareas...');
        const [tasks] = await connection.execute(`
            SELECT 
                id,
                titulo,
                descripcion,
                prioridad,
                estado,
                estado_workflow,
                created_at,
                updated_at,
                fecha_entrega,
                fecha_limite,
                proyecto_id,
                fase_id,
                asignado_a,
                area_trabajo_id,
                archivo_url,
                observaciones
            FROM entregables
            ORDER BY created_at DESC
            LIMIT 10
        `);

        console.log(`\n📝 ÚLTIMAS 10 TAREAS:\n`);

        tasks.forEach((task, index) => {
            console.log(`--- TAREA ${index + 1} ---`);
            console.log(`🆔 ID: ${task.id}`);
            console.log(`📝 Título: ${task.titulo}`);
            console.log(`📄 Descripción: ${task.descripcion || 'Sin descripción'}`);
            console.log(`⚡ Prioridad: ${task.prioridad || 'Sin prioridad'}`);
            console.log(`📊 Estado: ${task.estado || 'Sin estado'}`);
            console.log(`🔄 Estado Workflow: ${task.estado_workflow || 'Sin estado workflow'}`);
            console.log(`📅 Creado: ${task.created_at}`);
            console.log(`🔄 Actualizado: ${task.updated_at || 'No actualizado'}`);
            console.log(`📋 Fecha entrega: ${task.fecha_entrega || 'Sin fecha'}`);
            console.log(`⏰ Fecha límite: ${task.fecha_limite || 'Sin límite'}`);
            console.log(`🏗️ Proyecto ID: ${task.proyecto_id}`);
            console.log(`📋 Fase ID: ${task.fase_id}`);
            console.log(`🏢 Área trabajo ID: ${task.area_trabajo_id || 'Sin área'}`);
            console.log(`👤 Asignado a ID: ${task.asignado_a || 'Sin asignar'}`);
            console.log(`📎 Archivo: ${task.archivo_url || 'Sin archivo'}`);
            console.log(`📝 Observaciones: ${task.observaciones || 'Sin observaciones'}`);
            console.log('');
        });

        // Estadísticas básicas
        console.log('📊 ESTADÍSTICAS BÁSICAS:');
        
        const [estadosResult] = await connection.execute(`
            SELECT estado, COUNT(*) as cantidad 
            FROM entregables 
            GROUP BY estado
        `);
        
        console.log('\n📈 Por estado:');
        estadosResult.forEach(row => {
            console.log(`   ${row.estado}: ${row.cantidad} tareas`);
        });

        const [prioridadesResult] = await connection.execute(`
            SELECT prioridad, COUNT(*) as cantidad 
            FROM entregables 
            GROUP BY prioridad
        `);
        
        console.log('\n⚡ Por prioridad:');
        prioridadesResult.forEach(row => {
            console.log(`   ${row.prioridad}: ${row.cantidad} tareas`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.code) {
            console.error('🔴 Código de error:', error.code);
        }
    } finally {
        if (connection) {
            await connection.end();
            console.log('\n🔌 Conexión cerrada');
        }
    }
}

// Ejecutar la función
checkCurrentTasks().catch(console.error);