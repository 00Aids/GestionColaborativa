const mysql = require('mysql2/promise');
require('dotenv').config();

async function fixNuevoEstudiante2Assignment() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('=== SOLUCIONANDO ASIGNACIÓN DE nuevoestudiante2@test.com ===\n');

        const userId = 9; // ID del usuario nuevoestudiante2@test.com
        const projectId = 2; // ID del proyecto1

        // 1. Verificar estado actual
        console.log('🔍 Estado actual:');
        
        const [currentProject] = await connection.execute(`
            SELECT p.id, p.titulo, p.estudiante_id, 
                   u.nombres, u.apellidos, u.email
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.id = ?
        `, [projectId]);

        if (currentProject.length > 0) {
            const project = currentProject[0];
            console.log(`   Proyecto: ${project.titulo} (ID: ${project.id})`);
            if (project.estudiante_id) {
                console.log(`   Estudiante actual: ${project.nombres} ${project.apellidos} (${project.email})`);
            } else {
                console.log(`   Estudiante actual: Sin asignar`);
            }
        }

        // 2. Verificar entregables del proyecto
        const [projectDeliverables] = await connection.execute(`
            SELECT COUNT(*) as total_entregables
            FROM entregables e
            WHERE e.proyecto_id = ?
        `, [projectId]);

        console.log(`   Entregables en el proyecto: ${projectDeliverables[0].total_entregables}\n`);

        // 3. Asignar el estudiante al proyecto
        console.log('🔧 Asignando estudiante al proyecto...');
        
        await connection.execute(`
            UPDATE proyectos 
            SET estudiante_id = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [userId, projectId]);

        console.log('✅ Estudiante asignado correctamente\n');

        // 4. Verificar la asignación
        console.log('🔍 Verificando asignación:');
        
        const [updatedProject] = await connection.execute(`
            SELECT p.id, p.titulo, p.estudiante_id, 
                   u.nombres, u.apellidos, u.email
            FROM proyectos p
            LEFT JOIN usuarios u ON p.estudiante_id = u.id
            WHERE p.id = ?
        `, [projectId]);

        if (updatedProject.length > 0) {
            const project = updatedProject[0];
            console.log(`   Proyecto: ${project.titulo} (ID: ${project.id})`);
            console.log(`   Estudiante asignado: ${project.nombres} ${project.apellidos} (${project.email})\n`);
        }

        // 5. Verificar entregables ahora disponibles para el estudiante
        console.log('📦 Entregables ahora disponibles para el estudiante:');
        
        const [studentDeliverables] = await connection.execute(`
            SELECT 
                e.id,
                e.titulo,
                e.descripcion,
                e.fecha_limite,
                e.estado,
                p.titulo as proyecto_titulo
            FROM entregables e
            INNER JOIN proyectos p ON e.proyecto_id = p.id
            WHERE p.estudiante_id = ?
            ORDER BY e.fecha_limite ASC
        `, [userId]);

        if (studentDeliverables.length === 0) {
            console.log('   ❌ Aún no hay entregables disponibles');
        } else {
            studentDeliverables.forEach(deliverable => {
                console.log(`   - ID: ${deliverable.id}`);
                console.log(`     Título: ${deliverable.titulo}`);
                console.log(`     Proyecto: ${deliverable.proyecto_titulo}`);
                console.log(`     Estado: ${deliverable.estado}`);
                console.log(`     Fecha límite: ${deliverable.fecha_limite}`);
                console.log('');
            });
        }

        console.log('🎉 ¡Problema resuelto! El estudiante ahora puede ver sus entregables.');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await connection.end();
    }
}

fixNuevoEstudiante2Assignment();