const mysql = require('mysql2/promise');

async function createTestProject() {
    console.log('=== CREANDO PROYECTO DE PRUEBA ===');
    
    try {
        // Conectar a la base de datos
        const connection = await mysql.createConnection({
            host: 'localhost',
            user: 'root',
            password: 'root',
            database: 'gestion_academica'
        });
        
        console.log('✅ Conectado a la base de datos');
        
        // Verificar si ya existe un proyecto
        const [existingProjects] = await connection.execute('SELECT * FROM proyectos LIMIT 1');
        
        if (existingProjects.length > 0) {
            console.log('✅ Ya existe un proyecto:', existingProjects[0]);
            await connection.end();
            return;
        }
        
        // Obtener un usuario para asignar como estudiante
        const [users] = await connection.execute('SELECT * FROM usuarios LIMIT 1');
        
        if (users.length === 0) {
            console.log('❌ No hay usuarios en la base de datos');
            await connection.end();
            return;
        }
        
        const user = users[0];
        console.log('👤 Usuario encontrado:', user.nombres, user.apellidos);
        
        // Crear proyecto de prueba
        const projectData = {
            titulo: 'Proyecto de Prueba para Kanban',
            descripcion: 'Este es un proyecto creado automáticamente para probar el sistema Kanban',
            estudiante_id: user.id,
            area_trabajo_id: user.area_trabajo_id || 1,
            estado: 'activo',
            fecha_inicio: new Date().toISOString().split('T')[0],
            fecha_fin: '2024-12-31'
        };
        
        const insertQuery = `
            INSERT INTO proyectos (titulo, descripcion, estudiante_id, area_trabajo_id, estado, fecha_inicio, fecha_fin)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;
        
        const [result] = await connection.execute(insertQuery, [
            projectData.titulo,
            projectData.descripcion,
            projectData.estudiante_id,
            projectData.area_trabajo_id,
            projectData.estado,
            projectData.fecha_inicio,
            projectData.fecha_fin
        ]);
        
        console.log('✅ Proyecto creado exitosamente con ID:', result.insertId);
        
        // Verificar el proyecto creado
        const [newProject] = await connection.execute('SELECT * FROM proyectos WHERE id = ?', [result.insertId]);
        console.log('📋 Proyecto creado:', newProject[0]);
        
        await connection.end();
        console.log('✅ Proyecto de prueba listo para usar');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createTestProject();