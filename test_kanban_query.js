const mysql = require('mysql2/promise');
require('dotenv').config();

async function testKanbanQuery() {
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'gestion_academica',
            port: process.env.DB_PORT || 3306
        });
        
        // First, let's see what projects exist
        const [projects] = await connection.execute('SELECT id, titulo FROM proyectos ORDER BY id DESC LIMIT 5');
        console.log('Available projects:');
        projects.forEach(project => {
            console.log(`- ID: ${project.id}, Title: "${project.titulo}"`);
        });
        
        // Check which projects have tasks
        const [tasksWithProjects] = await connection.execute(`
            SELECT e.proyecto_id, p.titulo, COUNT(*) as task_count 
            FROM entregables e 
            LEFT JOIN proyectos p ON e.proyecto_id = p.id 
            GROUP BY e.proyecto_id, p.titulo 
            ORDER BY e.proyecto_id DESC
        `);
        
        console.log('\nProjects with tasks:');
        tasksWithProjects.forEach(item => {
            console.log(`- Project ID: ${item.proyecto_id}, Title: "${item.titulo}", Tasks: ${item.task_count}`);
        });
        
        if (projects.length > 0) {
            // Test with the first project that has tasks, or the first project if none have tasks
            let projectId = projects[0].id;
            if (tasksWithProjects.length > 0) {
                projectId = tasksWithProjects[0].proyecto_id;
            }
            
            console.log(`\nTesting Kanban query for project ID: ${projectId}`);
            
            // Test the exact query from getProjectTasksWithWorkflow
            const query = `
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
                LEFT JOIN usuarios ua ON e.asignado_a = ua.id
                WHERE e.proyecto_id = ?
                ORDER BY e.created_at DESC
            `;
            
            const [rows] = await connection.execute(query, [projectId]);
            
            console.log(`\nFound ${rows.length} tasks for project ${projectId}:`);
            rows.forEach(task => {
                console.log(`- ID: ${task.id}, Title: "${task.titulo}", Workflow Status: ${task.estado_workflow}, Status: ${task.estado}`);
            });
            
            // Group by workflow status
            const groupedTasks = {
                todo: [],
                in_progress: [],
                done: []
            };
            
            rows.forEach(task => {
                const workflowStatus = task.estado_workflow || 'todo';
                if (groupedTasks[workflowStatus]) {
                    groupedTasks[workflowStatus].push(task);
                }
            });
            
            console.log('\nGrouped tasks:');
            console.log(`- TODO: ${groupedTasks.todo.length} tasks`);
            console.log(`- IN PROGRESS: ${groupedTasks.in_progress.length} tasks`);
            console.log(`- DONE: ${groupedTasks.done.length} tasks`);
        }
        
        await connection.end();
    } catch (error) {
        console.error('Error testing Kanban query:', error);
    }
}

testKanbanQuery();